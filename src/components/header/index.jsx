import React from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/authContext'
import { doSignOut } from '../../firebase/auth'

const Header = () => {
    const navigate = useNavigate()
    const { userLoggedIn } = useAuth()
    
    const logoutButtonStyle = {
        position: 'absolute',
        top: '10px',
        right: '20px',
        zIndex: 100, // Increased z-index
        backgroundColor: '#4B5563', 
        color: 'white',
        padding: '8px 16px',
        borderRadius: '6px',
        cursor: 'pointer',
        border: 'none',
        fontWeight: 'bold'
    };

    const homeButtonStyle = {
        position: 'absolute',
        top: '5px',
        left: '20px',
        zIndex: 100, // Increased z-index
        color: '#ffffff', 
        fontSize: '30px', 
        textDecoration: 'none', 
        transition: 'color 0.2s', 
    };
    

    return (
        <React.Fragment>
            {/* Home Button */}
            <Link to="/" style={homeButtonStyle} className="hover:text-green-400">
                𖠿
            </Link>
            {userLoggedIn &&  (
                <button
                    onClick={async () => {
                        try {
                            await doSignOut();
                            navigate('/');
                        } catch (err) {
                            console.error("Sign out error:", err);
                        }
                    }}
                    style={logoutButtonStyle}
                >
                    Logout 
                </button>
            )}
        </React.Fragment>
    )
}

export default Header