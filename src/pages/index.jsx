import Layout from "./Layout.jsx";

import Dashboard from "./Dashboard";

import Upload from "./Upload";

import Inspectors from "./Inspectors";

import TPIAgencies from "./TPIAgencies";

import Profile from "./Profile";

import UserManagement from "./UserManagement";

import Reports from "./Reports";

import TPIPerformance from "./TPIPerformance";

import Signup from "./Signup";

import Login from "./Login";

import { BrowserRouter as Router, Route, Routes, useLocation } from 'react-router-dom';

const PAGES = {

    Dashboard: Dashboard,

    Upload: Upload,

    Inspectors: Inspectors,

    TPIAgencies: TPIAgencies,

    Profile: Profile,

    UserManagement: UserManagement,

    Reports: Reports,

    TPIPerformance: TPIPerformance,

}

function _getCurrentPage(url) {
    if (url.endsWith('/')) {
        url = url.slice(0, -1);
    }
    let urlLastPart = url.split('/').pop();
    if (urlLastPart.includes('?')) {
        urlLastPart = urlLastPart.split('?')[0];
    }

    const pageName = Object.keys(PAGES).find(page => page.toLowerCase() === urlLastPart.toLowerCase());
    return pageName || Object.keys(PAGES)[0];
}

// Create a wrapper component that uses useLocation inside the Router context
function PagesContent() {
    const location = useLocation();
    const currentPage = _getCurrentPage(location.pathname);

    return (
        <Routes>
            <Route path="/signup" element={<Signup />} />
            <Route path="/login" element={<Login />} />
            <Route path="*" element={
                <Layout currentPageName={currentPage}>
                    <Routes>
                        <Route path="/" element={<Dashboard />} />
                        <Route path="/Dashboard" element={<Dashboard />} />
                        <Route path="/Upload" element={<Upload />} />
                        <Route path="/Inspectors" element={<Inspectors />} />
                        <Route path="/TPIAgencies" element={<TPIAgencies />} />
                        <Route path="/Profile" element={<Profile />} />
                        <Route path="/UserManagement" element={<UserManagement />} />
                        <Route path="/Reports" element={<Reports />} />
                        <Route path="/TPIPerformance" element={<TPIPerformance />} />
                    </Routes>
                </Layout>
            } />
        </Routes>
    );
}

export default function Pages() {
    return (
        <Router>
            <PagesContent />
        </Router>
    );
}