#!/usr/bin/env python3
import os
import sys
import shutil
import subprocess
import argparse

# --- CONFIGURATION ---
BACKEND_URL = "http://localhost:5000/api/review"
DASHBOARD_URL = "http://localhost:5000/review"

def get_git_root(path=None):
    if path is None:
        path = os.getcwd()
    
    try:
        result = subprocess.run(
            ["git", "rev-parse", "--show-toplevel"],
            cwd=path,
            capture_output=True,
            text=True,
            check=True
        )
        return result.stdout.strip()
    except subprocess.CalledProcessError:
        return None

def is_git_repo(path=None):
    return get_git_root(path) is not None

def install_hook(target_repo_path=None):
    if target_repo_path:
        target_repo_path = os.path.abspath(target_repo_path)
        if not is_git_repo(target_repo_path):
            print(f"Error: {target_repo_path} is not a git repository.")
            return False
        git_root = get_git_root(target_repo_path)
    else:
        git_root = get_git_root()
        if not git_root:
            print("Error: Not in a git repository.")
            return False
    
    print(f"📂 Installing hook in: {git_root}")
    
    # Get the absolute path to the backend directory
    script_dir = os.path.dirname(os.path.abspath(__file__))
    backend_path = os.path.join(script_dir, "backend")
    
    hooks_dir = os.path.join(git_root, ".git", "hooks")
    os.makedirs(hooks_dir, exist_ok=True)
    
    hook_path = os.path.join(hooks_dir, "pre-commit")
    
    # Backup existing hook
    if os.path.exists(hook_path):
        try:
            # Try reading with utf-8 to avoid decoding errors
            with open(hook_path, 'r', encoding='utf-8') as f:
                content = f.read()
            
            if "AI Code Reviewer" in content:
                overwrite = input(f"AI Reviewer hook already exists. Update it? (y/n): ")
                if overwrite.lower() != 'y': return False
            else:
                response = input(f"A different pre-commit hook exists. Overwrite? (y/n): ")
                if response.lower() != 'y': return False
                backup_path = hook_path + ".backup"
                shutil.copy2(hook_path, backup_path)
                print(f"Backed up existing hook to: {backup_path}")
        except Exception:
            # If reading fails (e.g. binary file), just ask to overwrite
            response = input(f"An existing pre-commit hook exists (could not read content). Overwrite? (y/n): ")
            if response.lower() != 'y': return False
            backup_path = hook_path + ".backup"
            shutil.copy2(hook_path, backup_path)
            print(f"Backed up existing hook to: {backup_path}")

    # --- THE HOOK SCRIPT CONTENT ---
    # We explicitly set sys.stdout encoding to utf-8 inside the hook 
    # to prevent crashes when printing emojis in the git bash/cmd
    hook_content = f'''#!/usr/bin/env python3
# AI Code Reviewer Pre-commit Hook
import sys
import subprocess
import json
import urllib.request
import webbrowser
import os

API_URL = "{BACKEND_URL}"
DASHBOARD_BASE_URL = "{DASHBOARD_URL}"
BACKEND_PATH = r"{backend_path}"

def main():
    # Force UTF-8 encoding for stdout to handle emojis on Windows terminals
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except AttributeError:
        pass # Python < 3.7 doesn't support reconfigure, but usually fine on Mac/Linux

    print("🤖 AI Reviewing Staged Changes...")

    # 1. Get Diff
    try:
        diff_process = subprocess.run(
            ["git", "diff", "--cached"], 
            capture_output=True, 
            text=True, 
            check=True,
            encoding='utf-8' 
        )
        diff = diff_process.stdout
        
        if not diff.strip():
            sys.exit(0) 
            
    except subprocess.CalledProcessError:
        sys.exit(0)
    except Exception:
        sys.exit(0)

    # 2. Send to Backend
    try:
        repo_path = os.getcwd()
        payload = json.dumps({{"diff": diff, "repoPath": repo_path}}).encode("utf-8")
        headers = {{"Content-Type": "application/json"}}
        
        req = urllib.request.Request(API_URL, data=payload, headers=headers)
        
        with urllib.request.urlopen(req) as response:
            if response.status != 200:
                print(f"⚠️ Server returned status {{response.status}}. Skipping.")
                sys.exit(0)
                
            data = json.loads(response.read().decode("utf-8"))
            
            is_approved = data.get("approved", True)
            review_id = data.get("reviewId", "")
            findings = data.get("findings", [])

            if is_approved:
                print("✅ AI Approved.")
                sys.exit(0)
            else:
                print("\\n❌ AI REJECTED COMMIT")
                print(f"Found {{len(findings)}} issues.")
                
                for f in findings:
                    if f.get('severity') == 'CRITICAL':
                        print(f" - [CRITICAL] line {{f.get('line_number')}}: {{f.get('message')}}")

                if review_id:
                    full_url = f"{{DASHBOARD_BASE_URL}}/{{review_id}}"
                    print(f"\\n👀 Opening detailed report: {{full_url}}")
                    try:
                        webbrowser.open(full_url)
                    except:
                        pass
                
                sys.exit(1)

    except urllib.error.URLError as url_error:
        print("⚠️ Could not connect to AI Backend (localhost:5000).")
        print("   Attempting to start the server...")
        try:
            # Try to start the backend server
            import platform
            import time
            
            if not os.path.exists(BACKEND_PATH):
                print(f"   Backend path not found: {{BACKEND_PATH}}")
                print("   Please start the server manually with: cd backend && npm start")
                sys.exit(1)
            
            if platform.system() == "Windows":
                subprocess.Popen(
                    ["cmd", "/c", "start", "cmd", "/k", "npm", "start"],
                    cwd=BACKEND_PATH,
                    shell=True
                )
            else:
                subprocess.Popen(
                    ["npm", "start"],
                    cwd=BACKEND_PATH,
                    stdout=subprocess.DEVNULL,
                    stderr=subprocess.DEVNULL
                )
            
            print("   Waiting for server to start...")
            
            # Wait up to 30 seconds for server to be ready
            max_attempts = 30
            server_ready = False
            for attempt in range(max_attempts):
                time.sleep(1)
                try:
                    test_req = urllib.request.Request(API_URL, data=json.dumps({{"diff": diff, "repoPath": repo_path}}).encode("utf-8"), headers={{"Content-Type": "application/json"}})
                    with urllib.request.urlopen(test_req, timeout=2) as test_response:
                        # Server is ready and we got a response
                        print("   ✅ Server is ready!")
                        
                        if test_response.status == 200:
                            data = json.loads(test_response.read().decode("utf-8"))
                            
                            is_approved = data.get("approved", True)
                            review_id = data.get("reviewId", "")
                            findings = data.get("findings", [])

                            if is_approved:
                                print("✅ AI Approved.")
                                sys.exit(0)
                            else:
                                print("\\n❌ AI REJECTED COMMIT")
                                print(f"Found {{len(findings)}} issues.")
                                
                                for f in findings:
                                    if f.get('severity') == 'CRITICAL':
                                        print(f" - [CRITICAL] line {{f.get('line_number')}}: {{f.get('message')}}")

                                if review_id:
                                    full_url = f"{{DASHBOARD_BASE_URL}}/{{review_id}}"
                                    print(f"\\n👀 Opening detailed report: {{full_url}}")
                                    try:
                                        webbrowser.open(full_url)
                                    except:
                                        pass
                                
                                sys.exit(1)
                        else:
                            sys.exit(0)
                        
                except urllib.error.URLError:
                    print(f"   Waiting... ({{attempt + 1}}/{{max_attempts}})")
                    continue
                except Exception as retry_error:
                    print(f"   Error during retry: {{retry_error}}")
                    continue
            
            print("   ⏱️ Server took too long to start.")
            print("   Commit blocked. Please ensure the server starts successfully and try again.")
            sys.exit(1)
            
        except Exception as start_error:
            print(f"   Could not start server: {{start_error}}")
            print(f"   Please start the server manually: cd {{BACKEND_PATH}} && npm start")
            sys.exit(1)
    except Exception as e:
        print(f"⚠️ Error during review: {{e}}")
        sys.exit(0)

if __name__ == "__main__":
    main()
'''
    
    # FIX: Use utf-8 encoding when writing the file to support emojis on Windows
    with open(hook_path, 'w', newline='\n', encoding='utf-8') as f:
        f.write(hook_content)
    
    # chmod +x on unix/mac/linux
    if os.name != 'nt':
        os.chmod(hook_path, 0o755)
    
    print(f"✅ Hook installed successfully: {hook_path}")
    print(f"   Backend expected at: {BACKEND_URL}")
    return True

def uninstall_hook(target_repo_path=None):
    if target_repo_path:
        target_repo_path = os.path.abspath(target_repo_path)
        git_root = get_git_root(target_repo_path)
    else:
        git_root = get_git_root()
    
    if not git_root:
        print("Error: Not a git repository.")
        return False
    
    hook_path = os.path.join(git_root, ".git", "hooks", "pre-commit")
    
    if not os.path.exists(hook_path):
        print("No pre-commit hook found.")
        return False
    
    try:
        with open(hook_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        if "AI Code Reviewer" not in content:
            print("Warning: This pre-commit hook was not created by this tool.")
            response = input("Remove it anyway? (y/n): ")
            if response.lower() != 'y':
                print("Cancelled.")
                return False
    except Exception:
         # Fallback if file is unreadable
        print("Warning: Could not verify existing hook content.")
        response = input("Remove it anyway? (y/n): ")
        if response.lower() != 'y': return False
    
    os.remove(hook_path)
    print(f"Removed hook from: {git_root}")
    
    # Restore backup
    backup_path = hook_path + ".backup"
    if os.path.exists(backup_path):
        response = input("Restore previous hook from backup? (y/n): ")
        if response.lower() == 'y':
            shutil.move(backup_path, hook_path)
            print("Restored previous hook.")
    
    return True

def main():
    parser = argparse.ArgumentParser(
        description="Install or uninstall the AI Code Reviewer git hook",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  python setup.py install
  python setup.py uninstall
        """
    )
    
    parser.add_argument(
        "action",
        choices=["install", "uninstall"],
        help="Action to perform"
    )
    
    parser.add_argument(
        "path",
        nargs="?",
        default=None,
        help="Path to git repository (defaults to current directory)"
    )
    
    args = parser.parse_args()
    
    print("\n" + "="*60)
    print("AI Code Reviewer Setup")
    print("="*60 + "\n")
    
    if args.action == "install":
        success = install_hook(args.path)
    else:
        success = uninstall_hook(args.path)
    
    sys.exit(0 if success else 1)

if __name__ == "__main__":
    main()