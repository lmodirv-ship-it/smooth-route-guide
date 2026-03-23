import { Navigate } from "react-router-dom";

/** Legacy login page – redirects to the unified AuthPage */
const Login = () => <Navigate to="/login" replace />;

export default Login;
