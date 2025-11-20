import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, CheckCircle, Github, Calendar } from 'lucide-react';
import styles from '../styles/Dashboard.module.css';

const Review = () => {
    const navigate = useNavigate();
    const [reviews, setReviews] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        fetch('/api/reviews')
            .then(res => {
                if (!res.ok) throw new Error(`HTTP ${res.status}`);
                return res.json();
            })
            .then(data => {
                setReviews(data || []);
                setLoading(false);
            })
            .catch(err => {
                console.error('Failed to fetch reviews:', err);
                setError(err.message);
                setLoading(false);
            });
    }, []);

    if (loading) {
        return (
            <div className={styles.loadingContainer}>
                <p>Loading reviews...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className={styles.errorContainer}>
                <p className={styles.errorText}>Error: {error}</p>
                <p className={styles.errorSubtext}>Make sure the backend is running on port 5000</p>
            </div>
        );
    }

    if (reviews.length === 0) {
        return (
            <div className={styles.emptyState}>
                <div className={styles.emptyIcon}>
                    <Github size={32} />
                </div>
                <h3 className={styles.emptyTitle}>No Reviews Yet</h3>
                <p className={styles.emptyText}>Make a commit to trigger an AI code review!</p>
            </div>
        );
    }

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <h1 className={styles.headerTitle}>Code Reviews</h1>
                <p className={styles.headerSubtitle}>AI-powered commit analysis history</p>
            </div>

            <div className={styles.reviewsList}>
                {reviews.map((review) => {
                    const criticalCount = review.findings?.filter(f => f.severity === 'CRITICAL').length || 0;
                    const suggestionCount = review.findings?.filter(f => f.severity === 'SUGGESTION').length || 0;
                    const totalFindings = review.findings?.length || 0;
                    const date = new Date(review.createdAt);

                    return (
                        <div
                            key={review._id}
                            onClick={() => navigate(`/review/${review._id}`)}
                            className={styles.reviewCard}
                        >
                            <div className={styles.reviewHeader}>
                                <div className={styles.reviewInfo}>
                                    <div className={styles.reviewTitleRow}>
                                        <h3 className={styles.reviewTitle}>
                                            <Github size={18} /> {review.repoName || 'Local Repository'}
                                        </h3>
                                        {review.verdict === 'REJECTED' ? (
                                            <span className={`${styles.badge} ${styles.badgeRejected}`}>
                                                Rejected
                                            </span>
                                        ) : (
                                            <span className={`${styles.badge} ${styles.badgeApproved}`}>
                                                Approved
                                            </span>
                                        )}
                                    </div>
                                    <p className={styles.reviewDate}>
                                        <Calendar size={14} />
                                        {date.toLocaleString()}
                                    </p>
                                </div>

                                <div className={styles.reviewStats}>
                                    <p className={styles.statsNumber}>{totalFindings}</p>
                                    <p className={styles.statsLabel}>
                                        {totalFindings === 1 ? 'Issue' : 'Issues'}
                                    </p>
                                </div>
                            </div>

                            {totalFindings > 0 && (
                                <div className={styles.reviewFooter}>
                                    {criticalCount > 0 && (
                                        <div className={styles.statItem}>
                                            <AlertTriangle size={16} className={styles.statCritical} />
                                            <span className={styles.statLabel}>
                                                <span className={`${styles.statNumber} ${styles.statCritical}`}>{criticalCount}</span> Critical
                                            </span>
                                        </div>
                                    )}
                                    {suggestionCount > 0 && (
                                        <div className={styles.statItem}>
                                            <CheckCircle size={16} className={styles.statSuggestion} />
                                            <span className={styles.statLabel}>
                                                <span className={`${styles.statNumber} ${styles.statSuggestion}`}>{suggestionCount}</span> Suggestions
                                            </span>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default Review;