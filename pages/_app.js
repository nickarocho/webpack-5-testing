import Amplify from "aws-amplify";

import "../styles/globals.css";
import "@aws-amplify/ui-react/styles.css"; // default theme
import awsExports from "../src/aws-exports";

Amplify.configure({ ...awsExports, ssr: true });

export default function App({ Component, pageProps }) {
  return <Component {...pageProps} />;
}
