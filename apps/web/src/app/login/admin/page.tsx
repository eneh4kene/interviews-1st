import LoginForm from '../../../components/auth/LoginForm';

export default function AdminLoginPage() {
  return (
    <LoginForm
      userType="admin"
      title="Admin Login"
      description="Access system administration panel"
      redirectTo="/admin"
    />
  );
} 