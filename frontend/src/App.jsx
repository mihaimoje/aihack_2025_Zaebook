import { Routes, Route } from "react-router-dom";
import Review from "./pages/Review";
import ReviewDetail from "./pages/ReviewDetail";
import Settings from "./pages/Settings";

function App() {
    return (
        <div style={{ padding: '20px' }}>
            <Routes>
                <Route path="/" element={<Review />} />
                <Route path="/review/:id" element={<ReviewDetail />} />
                <Route path="/settings" element={<Settings />} />
            </Routes>
        </div>
    );
}

export default App;