import React, { useState } from 'react'
import { Navigate, Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../../contexts/authContext'
import { doCreateUserWithEmailAndPassword } from '../../../firebase/auth'

const Register = () => {

    const navigate = useNavigate()

    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [confirmPassword, setconfirmPassword] = useState('')
    const [isRegistering, setIsRegistering] = useState(false)
    const [errorMessage, setErrorMessage] = useState('')

    const { userLoggedIn } = useAuth()

    const onSubmit = async (e) => {
        e.preventDefault()
        if(!isRegistering) {
            setIsRegistering(true)
            await doCreateUserWithEmailAndPassword(email, password)
        }
    }

    return (
        <>
            {userLoggedIn && (<Navigate to={'/'} replace={true} />)}

            <main className="auth-wrapper relative">
                <div className="auth-card space-y-6">
                    <div className="text-center mb-4">
                        <h3 className="text-white text-3xl sm:text-4xl font-bold tracking-tight">Create an Account</h3>
                        <p className="text-gray-400 mt-2 text-sm">Begin your personalized journey today</p>
                    </div>
                    <form
                        onSubmit={onSubmit}
                        className="space-y-4"
                    >
                        <div>
                            <label className="auth-label">
                                Email Address
                            </label>
                            <input
                                type="email"
                                autoComplete='email'
                                required
                                value={email} onChange={(e) => { setEmail(e.target.value) }}
                                className="auth-input"
                                placeholder="name@example.com"
                            />
                        </div>

                        <div>
                            <label className="auth-label">
                                Password
                            </label>
                            <input
                                disabled={isRegistering}
                                type="password"
                                autoComplete='new-password'
                                required
                                value={password} onChange={(e) => { setPassword(e.target.value) }}
                                className="auth-input"
                                placeholder="••••••••"
                            />
                        </div>

                        <div>
                            <label className="auth-label">
                                Confirm Password
                            </label>
                            <input
                                disabled={isRegistering}
                                type="password"
                                autoComplete='off'
                                required
                                value={confirmPassword} onChange={(e) => { setconfirmPassword(e.target.value) }}
                                className="auth-input"
                                placeholder="••••••••"
                            />
                        </div>

                        {errorMessage && (
                            <span className='text-red-600 font-bold'>{errorMessage}</span>
                        )}

                        <button
                            type="submit"
                            disabled={isRegistering}
                            className="auth-submit-btn"
                        >
                            {isRegistering ? 'Signing Up...' : 'Sign Up'}
                        </button>
                        <div className="text-sm text-center text-gray-400 mt-6 pt-4 border-t border-gray-700/50">
                            Already have an account? {' '}
                            <Link to={'/login'} className="text-blue-400 hover:text-blue-300 hover:underline font-semibold transition-colors duration-200">Log in</Link>
                        </div>
                    </form>
                </div>
            </main>
        </>
    )
}

export default Register