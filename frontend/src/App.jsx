import { Routes, Route } from "react-router-dom";
import Review from "./pages/Review";

// 1. Define the mock data object
const mockReviewData = {
    "findings": [
        {
            "severity": "CRITICAL",
            "line_number": 15,
            "message": "Potential command injection vulnerability using os.system with user input."
        },
        {
            "severity": "SUGGESTION",
            "line_number": 8,
            "message": "Function name 'proces_data' contains a typo and should be 'process_data'."
        }
    ]
};

function App() {
    return (
        // 2. Wrap everything in a Router components (typically BrowserRouter in index.js, but necessary here)
        // Note: Assuming you have <BrowserRouter> wrapping App in your main entry file.
        <div style={{ padding: '20px' }}> {/* Add a simple div for spacing */}
            <Routes>
                {/* 3. Pass the mock data as the required prop */}
                <Route
                    path="/"
                    element={<Review findingsData={mockReviewData} />}
                />
            </Routes>
        </div>
    );
}

export default App;