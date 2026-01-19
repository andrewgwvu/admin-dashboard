import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { authService } from '../services/auth.service';

export default function SSOCallbackPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [error, setError] = useState('');

  useEffect(() => {
    const token = searchParams.get('token');

    if (token) {
      authService.handleSSOCallback(token);
      navigate('/');
    } else {
      setError('No authentication token received');
      setTimeout(() => navigate('/login'), 3000);
    }
  }, [searchParams, navigate]);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <div className="rounded-md bg-red-50 dark:bg-red-900/30 p-4 mb-4">
            <p className="text-sm text-red-800 dark:text-red-300">{error}</p>
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Redirecting to login...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
      <div className="text-center">
        <Loader2 className="animate-spin h-12 w-12 text-blue-600 dark:text-blue-400 mx-auto mb-4" />
        <p className="text-gray-700 dark:text-gray-300">Completing sign in...</p>
      </div>
    </div>
  );
}
