import LoginForm from '../../../components/auth/LoginForm';

export default function ClientLoginPage() {
  return (
    <LoginForm
      userType="client"
      title="Client Login"
      description="Access your job search portal"
      redirectTo="/client"
    />
  );
} 