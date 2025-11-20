import React, { useState } from 'react';
import { FaExclamationTriangle, FaLightbulb, FaTimes } from 'react-icons/fa'; // Ensure FaTimes is imported for closing the chat
import styles from '../styles/Review.module.css';
import AIChat from './components/AIChat.jsx';

// --- Severity Data Mapping (unchanged) ---
const severityMap = {
    CRITICAL: {
        icon: FaExclamationTriangle,
        className: 'critical',
    },
    SUGGESTION: {
        icon: FaLightbulb,
        className: 'suggestion',
    },
};

const Review = ({ findingsData }) => {
    const { findings } = findingsData;
    // State to track the finding clicked for chat
    const [activeFinding, setActiveFinding] = useState(null);

    if (!findings || findings.length === 0) {
        return <div className={styles.container}>No findings found in this commit review. 🎉</div>;
    }

    // Handler to open the chat window
    const handleFindingClick = (finding) => {
        setActiveFinding(finding);
    };

    // Handler to close the chat window
    const handleChatClose = () => {
        setActiveFinding(null);
    };

    return (
        <>
            <div className={styles.container}>
                <h2 className={styles.title}>
                    Commit Review Findings
                    <FaExclamationTriangle color="#f0ad4e" size={20} />
                </h2>

                <ul className={styles.findingsList}>
                    {findings.map((finding, index) => {
                        const { severity, line_number, message } = finding;
                        const map = severityMap[severity] || severityMap.CRITICAL;
                        const Icon = map.icon;

                        // Combine base findingItem class with the specific severity class
                        // Add a pointer cursor to indicate it's clickable (via styles.clickable in CSS)
                        const itemClasses = `${styles.findingItem} ${styles[map.className]} ${styles.clickable}`;

                        return (
                            <li
                                key={index}
                                className={itemClasses}
                                onClick={() => handleFindingClick(finding)} // Click handler
                            >
                                <div className={styles.iconWrapper}>
                                    <Icon />
                                </div>

                                <div className={styles.content}>
                                    <div className={styles.header}>
                                        <span className={styles.severityTag}>{severity}</span>
                                        <span className={styles.lineNumber}>Line: **{line_number}**</span>
                                    </div>
                                    <p className={styles.message}>{message}</p>
                                </div>
                            </li>
                        );
                    })}
                </ul>
            </div>

            {/* Render the AIChat components if a finding is active */}
            {activeFinding && (
                <AIChat finding={activeFinding} onClose={handleChatClose} />
            )}
        </>
    );
};

export default Review;