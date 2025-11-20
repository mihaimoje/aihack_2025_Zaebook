import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { AlertTriangle, Lightbulb, CheckCircle, ChevronRight, Github, ArrowLeft } from 'lucide-react';
import AIChat from './components/AIChat';
import styles from '../styles/ReviewDetail.module.css';

const ReviewDetail = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [reviewData, setReviewData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [activeFinding, setActiveFinding] = useState(null);
    const [committing, setCommitting] = useState(false);
    const [commitMessage, setCommitMessage] = useState('');

    useEffect(() => {
        fetch(`/api/reviews/${id}`)
            .then(res => {
                if (!res.ok) throw new Error(`HTTP ${res.status}`);
                return res.json();
            })
            .then(data => {
                setReviewData(data);
                setLoading(false);
            })
            .catch(err => {
                console.error('Failed to fetch review:', err);
                setError(err.message);
                setLoading(false);
            });
    }, [id]);

    if (loading) {
        return (
            <div className={styles.loadingContainer}>
                <p>Loading review...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className={styles.errorContainer}>
                <p className={styles.errorText}>Error: {error}</p>
                <button
                    onClick={() => navigate('/')}
                    className={styles.errorButton}
                >
                    Back to Reviews
                </button>
            </div>
        );
    }

    const { findings = [], repoName, verdict, committedByUser, committedAt } = reviewData || {};

    const handleCommitAnyway = async () => {
        if (!commitMessage.trim()) {
            alert('Please enter a commit message');
            return;
        }

        if (!window.confirm('Are you sure you want to commit anyway, bypassing the AI review?')) {
            return;
        }

        setCommitting(true);
        try {
            const response = await fetch(`/api/reviews/${id}/commit`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ commitMessage: commitMessage.trim() })
            });

            if (response.ok) {
                const result = await response.json();
                alert('Commit successful! ' + result.message);
                // Reload review data to show committed state
                const updatedReview = await fetch(`/api/reviews/${id}`).then(r => r.json());
                setReviewData(updatedReview);
            } else {
                const error = await response.json();
                alert('Failed to commit: ' + error.error);
            }
        } catch (err) {
            console.error('Commit error:', err);
            alert('Failed to commit: ' + err.message);
        } finally {
            setCommitting(false);
        }
    };

    if (!findings || findings.length === 0) {
        return (
            <div className={styles.container}>
                <button
                    onClick={() => navigate('/')}
                    className={styles.backButton}
                >
                    <ArrowLeft size={20} /> Back to Reviews
                </button>
                <div className={styles.emptyState}>
                    <div className={styles.emptyIcon}>
                        <CheckCircle size={32} />
                    </div>
                    <h3 className={styles.emptyTitle}>Clean Commit!</h3>
                    <p className={styles.emptyText}>No issues found. You are good to go. 🎉</p>
                </div>
            </div>
        );
    }

    return (
        <div className={styles.container}>
            <button
                onClick={() => navigate('/')}
                className={styles.backButton}
            >
                <ArrowLeft size={20} /> Back to Reviews
            </button>

            <div className={styles.reviewHeader}>
                <div className={styles.headerInfo}>
                    <h2 className={styles.headerTitle}>
                        Commit Review
                        {verdict === 'REJECTED' ? (
                            <span className={`${styles.badge} ${styles.badgeRejected}`}>Rejected</span>
                        ) : (
                            <span className={`${styles.badge} ${styles.badgeApproved}`}>Approved</span>
                        )}
                    </h2>
                    <p className={styles.repoName}>
                        <Github size={14} /> {repoName || 'Local Repository'}
                    </p>
                </div>
                <div className={styles.headerStats}>
                    <p className={styles.statsNumber}>{findings.length}</p>
                    <p className={styles.statsLabel}>Issues Found</p>
                </div>
            </div>

            {committedByUser ? (
                <div className={styles.committedBanner}>
                    <CheckCircle size={20} />
                    <span>Committed by user on {new Date(committedAt).toLocaleString()}</span>
                </div>
            ) : (
                <div className={styles.commitButtonContainer}>
                    <input
                        type="text"
                        value={commitMessage}
                        onChange={(e) => setCommitMessage(e.target.value)}
                        placeholder="Enter commit message..."
                        className={styles.commitInput}
                        disabled={committing}
                    />
                    <button
                        onClick={handleCommitAnyway}
                        disabled={committing || !commitMessage.trim()}
                        className={styles.commitButton}
                    >
                        {committing ? 'Committing...' : 'Commit Anyway'}
                    </button>
                    <p className={styles.commitButtonHint}>Bypass AI review and commit changes</p>
                </div>
            )}

            <div className={styles.findingsList}>
                {findings.map((finding, index) => {
                    const isCritical = finding.severity === 'CRITICAL';
                    return (
                        <div
                            key={index}
                            onClick={() => setActiveFinding({
                                ...finding,
                                findingIndex: index,
                                reviewCommitted: committedByUser,
                                diff: reviewData.diff
                            })}
                            className={`${styles.findingCard} ${isCritical ? styles.findingCardCritical : styles.findingCardSuggestion}`}
                        >
                            <div className={styles.findingContent}>
                                <div className={`${styles.findingIcon} ${isCritical ? styles.findingIconCritical : styles.findingIconSuggestion}`}>
                                    {isCritical ? <AlertTriangle size={24} /> : <Lightbulb size={24} />}
                                </div>

                                <div className={styles.findingDetails}>
                                    <div className={styles.findingMeta}>
                                        <span className={`${styles.severityBadge} ${isCritical ? styles.severityBadgeCritical : styles.severityBadgeSuggestion}`}>
                                            {finding.severity}
                                        </span>
                                        <span className={styles.lineNumber}>Line {finding.line_number}</span>
                                    </div>
                                    <p className={styles.findingMessage}>{finding.message}</p>
                                </div>

                                <div className={styles.findingArrow}>
                                    <ChevronRight size={20} />
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            {activeFinding && (
                <AIChat
                    finding={activeFinding}
                    reviewId={id}
                    findingIndex={activeFinding.findingIndex}
                    onClose={() => setActiveFinding(null)}
                />
            )}
        </div>
    );
};

export default ReviewDetail;
