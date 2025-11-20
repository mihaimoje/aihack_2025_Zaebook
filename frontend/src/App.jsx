import { Routes, Route } from "react-router-dom";
import Review from "./pages/Review";
import ReviewDetail from "./pages/ReviewDetail";

function App() {
    return (
        <div style={{ padding: '20px' }}>
            <Routes>
                <Route path="/" element={<Review />} />
                <Route path="/review/:id" element={<ReviewDetail />} />
            </Routes>
        </div>
    );
}

export default App;