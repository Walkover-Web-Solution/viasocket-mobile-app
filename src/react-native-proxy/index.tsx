import GoogleLoginButton from "./components/GoogleLoginButton";

export function multiply(a: number, b: number): number {
  return a * b;
}
export function ShowGoogleLoginButton(props: {
  referenceId: string,
  onLoginSuccess: (result: any) => void;
  onLoginFailure: (error: any) => void;
  buttonText?: string;
  buttonStyle?: object;
  textStyle?: object;
  loadingColor?: string;
  disabled?: boolean;
}) {
  return <GoogleLoginButton {...props} />
}