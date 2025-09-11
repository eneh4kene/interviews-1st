import LoginForm from '../../../components/auth/LoginForm';

export default function ClientLoginPage() {
  return (
    <LoginForm
      userType="client"
      title="Talent Login"
      description="Access your job search portal"
      redirectTo="/client"
    />
  );
} 