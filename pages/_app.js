import { useEffect, useState } from "react";
import Amplify, { Auth, Hub } from "aws-amplify";

import { UserContext } from "../components/user";

import "../styles/globals.css";
import "@aws-amplify/ui-react/styles.css"; // default theme
import awsExports from "../src/aws-exports";

import styles from "../styles/Home.module.css";
import Link from "next/link";

Amplify.configure({ ...awsExports, ssr: true });

export default function App({ Component, pageProps }) {
  const [user, setUser] = useState(null);
  const [authState, setAuthState] = useState("not signed in");
  const methods = ["sign-in", "sign-up"];
  const [authMethod, setAuthMethod] = useState("sign-in");

  const getUser = async () => {
    try {
      const user = await Auth.currentAuthenticatedUser();
      setUser(user);
      console.log({ user });
    } catch (err) {
      setUser(null);
      console.error("error getting user in _app.js: ", err);
    }
  };

  useEffect(() => {
    getUser();
    const listener = (data) => {
      switch (data.payload.event) {
        case "signIn":
          console.log("user signed in");
          break;
        case "signUp":
          console.log("user signed up");
          break;
        case "signOut":
          console.log("user signed out");
          setAuthState("not signed in");
          setAuthMethod("sign in");
          break;
        case "signIn_failure":
          console.error("user sign in failed");
          break;
        case "tokenRefresh":
          console.log("token refresh succeeded");
          break;
        case "tokenRefresh_failure":
          console.error("token refresh failed");
          break;
        case "configured":
          console.log("the Auth module is configured");
      }
    };

    Hub.listen("auth", listener);
  }, []);

  const getCurrentUser = async () => {
    try {
      const user = await Auth.currentAuthenticatedUser();
      if (user) {
        setAuthMethod("sign out");
        setAuthState("signed in!");
        setUser(user);
      }
      return user;
    } catch (err) {
      setAuthState("not signed in");
      setUser(null);
      console.error("getCurrentUser error: ", err);
    }
  };

  const handleSignIn = async (data) => {
    const [username, password] = [data.get("username"), data.get("password")];

    if (!username || !password) {
      throw new Error("Username or Password missing!");
    }

    try {
      const user = await Auth.signIn(username, password);
      if (!user) {
        throw new Error("sign in error...");
      }

      setUser(user);
      setAuthState("signed in!");
      setAuthMethod("sign out");
    } catch (err) {
      console.error("sign in error: ", err);
    }
  };

  const handleSignUp = async (data) => {
    const [username, password] = [data.get("username"), data.get("password")];

    if (!username || !password) {
      throw new Error("Username or Password missing!");
    }

    try {
      const { user } = await Auth.signUp({
        username,
        password,
        attributes: {
          email: `nicaroch+${Math.floor(Math.random() * 9999)}@amazon.com`,
        },
      });
      setUser(user);
      if (user && !user.signInUserSession) {
        setAuthState("awaiting verification");
        setAuthMethod("confirm sign up");
      }
    } catch (err) {
      console.error("sign up error: ", err);
    }
  };

  const handleConfirmSignUp = async (data) => {
    const code = data.get("code");
    if (!code) {
      throw new Error("no code provided!");
    }

    try {
      const result = await Auth.confirmSignUp(user.username, code);
      if (result === "SUCCESS") {
        setAuthState("not signed in");
        setAuthMethod("sign in");
      }
    } catch (err) {
      console.error("confirm user error: ", err);
    }
  };

  const handleSignOut = async () => {
    await Auth.signOut();
    setAuthState("not signed in");
    getCurrentUser();
  };

  const handleDeleteUser = async () => {
    try {
      const result = await Auth.deleteUser();
      console.log({ result });
    } catch (error) {
      console.error("Error deleting user", error);
    }
  };

  const handleFetchDevices = async () => {
    try {
      const result = await Auth.fetchDevices();
      console.log("fetchDevices result: ", result);
    } catch (err) {
      console.error("Error fetching devices", err);
    }
  };

  const handleRememberDevice = async () => {
    try {
      const result = await Auth.rememberDevice();
      console.log("remember device result: ", result);
    } catch (error) {
      console.error("Error remembering device", error);
    }
  };

  const handleForgetDevice = async () => {
    try {
      const result = await Auth.forgetDevice();
      console.log("forget device result: ", result);
    } catch (error) {
      console.error("Error forgeting device", error);
    }
  };

  const handleSubmitAuth = (e) => {
    e.preventDefault();

    const form = new FormData(e.target);

    switch (authMethod.replace(/\s+/g, "-")) {
      case "sign-in":
        handleSignIn(form);
        break;
      case "sign-up":
        handleSignUp(form);
        break;
      case "confirm-sign-up":
        handleConfirmSignUp(form);
        break;
      case "sign-out":
        handleSignOut();
        break;
      default:
        console.log("default... do nothing");
    }
  };

  if (pageProps.protected && !user) {
    return <div>Loading...</div>;
  }

  return (
    <UserContext.Provider value={user}>
      {/* TODO: abstract the header & auth logic to its own component */}
      <header className={styles.navBar}>
        <Link href="/">
          <a className={styles.siteTitle}>Amplify x Next Super App</a>
        </Link>

        {!user ? (
          // not signed in
          <div className={styles.authContainer}>
            <details className={styles.authDropdown}>
              <summary>Sign In / Sign Up</summary>
              <div className={styles.authDropdownContent}>
                <form className={styles.authForm} onSubmit={handleSubmitAuth}>
                  {(authState === "not signed in" ||
                    authState === "sign in" ||
                    authState === "sign up") && (
                    <>
                      <fieldset
                        className={styles.authTypes}
                        onChange={(e) => setAuthMethod(e.target.value)}
                      >
                        {methods.map((method) => {
                          const methodEncoded = method.replace(/\s+/g, "-");
                          return (
                            <div key={`${method}`}>
                              <input
                                type="radio"
                                id={`${methodEncoded}-radio`}
                                name="authType"
                                value={methodEncoded}
                                defaultChecked={methods[0] === methodEncoded}
                              />
                              <label htmlFor={`${methodEncoded}-radio`}>
                                {method.replace(/-/g, " ")}
                              </label>
                            </div>
                          );
                        })}
                      </fieldset>
                      <input
                        type="text"
                        id="username"
                        name="username"
                        placeholder="Username"
                        className={styles.authInput}
                      />
                      <input
                        type="password"
                        id="password"
                        name="password"
                        placeholder="Password"
                        className={styles.authInput}
                      />
                    </>
                  )}
                  {/* confirm user code input */}
                  {authState === "awaiting verification" && (
                    <input
                      type="text"
                      id="code"
                      name="code"
                      placeholder="code"
                      className={styles.authAction}
                    />
                  )}
                  <input
                    type="submit"
                    value={authMethod.replace(/-/g, " ")}
                    className={styles.authAction}
                  />
                  <hr />
                  <div>
                    <button
                      className={`${styles.authAction} ${styles.authActionGoogle}`}
                      onClick={() =>
                        Auth.federatedSignIn({
                          provider: CognitoHostedUIIdentityProvider.Google,
                        })
                      }
                    >
                      Google Sign In →
                    </button>
                  </div>
                </form>
              </div>
            </details>
          </div>
        ) : (
          // signed in
          <div>
            <div className={styles.userContainer}>
              <h3>Welcome, {user.username}!</h3>
              <details className={styles.userControls}>
                <summary></summary>
                <button onClick={handleFetchDevices}>Fetch Devices</button>
                <button onClick={handleRememberDevice}>
                  Remember This Device
                </button>
                <button onClick={handleForgetDevice}>Forget This Device</button>
                <button
                  style={{ background: "#ac1515" }}
                  onClick={handleDeleteUser}
                >
                  Delete Your Account
                </button>
                <button onClick={handleSignOut}>Sign Out</button>
              </details>
            </div>
          </div>
        )}
      </header>
      <Component {...pageProps} />
    </UserContext.Provider>
  );
}
