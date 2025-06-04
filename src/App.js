import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import Home from './components/Home';
import Auth from './components/Auth';
import Profile from './components/Profile';
import { supabase } from './config/supabase';

function App() {
  const [user, setUser] = React.useState(null);

  React.useEffect(() => {
    // Check active sessions and sets the user
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });

    // Listen for changes on auth state (login, sign out, etc.)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <Router>
      <div className="min-h-screen bg-gray-100">
        {/* Navigation */}
        <nav className="bg-white shadow-sm">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between h-16">
              <div className="flex items-center">
                <Link to="/" className="text-xl font-bold text-gray-900">
                  FaceOff
                </Link>
              </div>
              <div className="flex items-center space-x-4">
                {user ? (
                  <>
                    <Link to="/profile" className="text-gray-700 hover:text-gray-900">
                      Profile
                    </Link>
                    <button
                      onClick={handleSignOut}
                      className="text-gray-700 hover:text-gray-900"
                    >
                      Sign Out
                    </button>
                  </>
                ) : (
                  <Link to="/auth" className="text-gray-700 hover:text-gray-900">
                    Sign In
                  </Link>
                )}
              </div>
            </div>
          </div>
        </nav>

        {/* Routes */}
        <Routes>
          <Route path="/" element={<Home user={user} />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/profile" element={<Profile />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
