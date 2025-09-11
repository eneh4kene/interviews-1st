import LoginForm from '../../../components/auth/LoginForm';

export default function WorkerLoginPage() {
  return (
    <LoginForm
      userType="worker"
      title="Talent Manager Login"
      description="Access your talent management dashboard"
      redirectTo="/dashboard"
    />
  );
} 