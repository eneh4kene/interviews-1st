import LoginForm from '../../../components/auth/LoginForm';

export default function WorkerLoginPage() {
  return (
    <LoginForm
      userType="worker"
      title="Worker Login"
      description="Access your client management dashboard"
      redirectTo="/dashboard"
    />
  );
} 