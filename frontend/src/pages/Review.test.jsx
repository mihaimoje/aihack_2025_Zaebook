import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import Review from './Review'; // Make sure this path is correct relative to Review.test.js

// --- Mock the CSS Module ---
// Jest needs to know what to return when it imports the CSS file.
// You must list every class name used in Review.js here.
jest.mock('../styles/Review.module.css', () => ({
    container: 'container',
    title: 'title',
    critical: 'critical',
    suggestion: 'suggestion',
    findingItem: 'findingItem',
    severityTag: 'severityTag',
    lineNumber: 'lineNumber',
    message: 'message',
    filterBar: 'filterBar', // Include filter classes if you added that functionality
    filterSelect: 'filterSelect',
    emptyList: 'emptyList'
}));

// --- Mock Data ---
const mockFindingsData = {
    findings: [
        {
            severity: "CRITICAL",
            line_number: 15,
            message: "Potential command injection vulnerability using os.system with user input."
        },
        {
            severity: "SUGGESTION",
            line_number: 8,
            message: "Function name 'proces_data' contains a typo and should be 'process_data'."
        }
    ]
};

const emptyFindingsData = { findings: [] };

// ------------------------------------------------------------------
// --- TEST CASES ---
// ------------------------------------------------------------------

test('renders all findings correctly on initial load', () => {
    render(<Review findingsData={mockFindingsData} />);

    // Assert that the title and key information are present
    expect(screen.getByText(/Commit Review Findings/i)).toBeInTheDocument();
    expect(screen.getByText('CRITICAL')).toBeInTheDocument();
    expect(screen.getByText(/Potential command injection vulnerability/i)).toBeInTheDocument();
    expect(screen.getByText(/Line: \*\*15\*\*/i)).toBeInTheDocument();

    expect(screen.getByText('SUGGESTION')).toBeInTheDocument();
});

test('renders empty state message when findings array is empty', () => {
    render(<Review findingsData={emptyFindingsData} />);

    // Assert the custom empty message appears
    expect(screen.getByText(/No findings found in this commit review\. 🎉/i)).toBeInTheDocument();

    // Assert no findings data is visible
    expect(screen.queryByText('CRITICAL')).not.toBeInTheDocument();
});