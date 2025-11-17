import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Home, ArrowLeft } from 'lucide-react';
import Button from '../../components/ui/Button';

const NotFound: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-primary-50 flex items-center justify-center px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 text-center">
        <div>
          <h1 className="text-6xl font-bold text-primary-900">404</h1>
          <h2 className="mt-6 text-3xl font-bold text-primary-900">Page Not Found</h2>
          <p className="mt-2 text-sm text-primary-500">
            The page you're looking for doesn't exist or has been moved.
          </p>
        </div>
        
        <div className="flex flex-col sm:flex-row items-center justify-center space-y-2 sm:space-y-0 sm:space-x-4">
          <Button
            variant="primary"
            className="w-full sm:w-auto"
            leftIcon={<Home size={16} />}
            onClick={() => navigate('/dashboard')}
          >
            Go to Dashboard
          </Button>
          <Button
            variant="secondary"
            className="w-full sm:w-auto"
            leftIcon={<ArrowLeft size={16} />}
            onClick={() => navigate(-1)}
          >
            Go Back
          </Button>
        </div>
      </div>
    </div>
  );
};

export default NotFound;
