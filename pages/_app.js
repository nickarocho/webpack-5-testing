import { useEffect, useState } from "react";
import Amplify, { Auth, Hub, AuthModeStrategyType } from "aws-amplify";
import { UserContext } from "../components/user";
import QRCode from "qrcode.react";

import "../styles/globals.css";
import "@aws-amplify/ui-react/styles.css"; // default theme
import awsExports from "../src/aws-exports";

import styles from "../styles/Home.module.css";
import Link from "next/link";

Amplify.configure({
  ...awsExports,
  ssr: true,
  DataStore: {
    authModeStrategyType: AuthModeStrategyType.MULTI_AUTH,
  },
});

export default function App({ Component, pageProps }) {
  const [user, setUser] = useState(null);
  const [authState, setAuthState] = useState("not signed in");
  const methods = ["sign-in", "sign-up"];
  const [authMethod, setAuthMethod] = useState("sign-in");
  const [qrCode, setQrCode] = useState("");

  const getUser = async () => {
    try {
      const user = await Auth.currentAuthenticatedUser();
      setUser(user);
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

  async function handleSignIn(data) {
    try {
      const [username, password] = [data.get("username"), data.get("password")];

      if (!username || !password) {
        throw new Error("Username or Password missing!");
      }

      const user = await Auth.signIn(username, password);
      setUser(user);

      if (
        user.challengeName === "SMS_MFA" ||
        user.challengeName === "SOFTWARE_TOKEN_MFA"
      ) {
        setAuthState("awaiting-verification");
        setAuthMethod("confirm-sign-in");

        // TODO
      } else if (user.challengeName === "NEW_PASSWORD_REQUIRED") {
        // const { requiredAttributes } = user.challengeParam; // the array of required attributes, e.g ['email', 'phone_number']
        // // You need to get the new password and required attributes from the UI inputs
        // // and then trigger the following function with a button click
        // // For example, the email and phone_number are required attributes
        // const { username, email, phone_number } = getInfoFromUserInput();
        // const loggedUser = await Auth.completeNewPassword(
        //   user, // the Cognito User Object
        //   newPassword, // the new password
        //   // OPTIONAL, the required attributes
        //   {
        //     email,
        //     phone_number,
        //   }
        // );
        // TODO
      } else if (user.challengeName === "MFA_SETUP") {
        // This happens when the MFA method is TOTP
        // The user needs to setup the TOTP before using it
        // More info please check the Enabling MFA part
        // Auth.setupTOTP(user);
      } else {
        // The user directly signs in
        if (!user) {
          throw new Error("sign in error...");
        }

        setUser(user);
        setAuthState("signed in!");
        setAuthMethod("sign out");
      }
    } catch (err) {
      if (err.code === "UserNotConfirmedException") {
        // In this case you need to resend the code and confirm the user
        console.error(
          "UserNotConfirmedException error: (This error happens if the user didn't finish the confirmation step when signing up) ",
          err
        );
      } else if (err.code === "PasswordResetRequiredException") {
        // In this case you need to call `forgotPassword` to reset the password
        console.error(
          "PasswordResetRequiredException error: (This error happens when the password is reset in the Cognito console) ",
          err
        );
      } else if (err.code === "NotAuthorizedException") {
        console.error(
          "NotAuthorizedException error: (This error happens when the incorrect password is provided) ",
          err
        );
      } else if (err.code === "UserNotFoundException") {
        console.error(
          "UserNotFoundException error: (This error happens when the supplied username/email does not exist in the Cognito user pool) ",
          err
        );
      } else {
        console.error("handleSignIn error: ", err);
      }
    }
  }

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
        setAuthState("awaiting-verification");
        setAuthMethod("confirm-sign-up");
      }
    } catch (err) {
      console.error("sign up error: ", err);
    }
  };

  const handleConfirmSignUp = async (data) => {
    try {
      const code = data.get("code");

      if (!code) {
        throw new Error("no code provided!");
      } else if (!user) {
        throw new Error("no user to find user.username");
      }

      const result = await Auth.confirmSignUp(user.username, code);

      if (result === "SUCCESS") {
        setAuthState("not signed in");
        setAuthMethod("sign in");
      }
    } catch (err) {
      console.error("confirm sign up error: ", err);
    }
  };

  const handleConfirmSignIn = async (data) => {
    const code = data.get("code");

    try {
      const loggedUser = await Auth.confirmSignIn(
        user,
        code,
        user.challengeName
      );

      setUser(loggedUser);
      setAuthState("signed in!");
      setAuthMethod("sign out");
    } catch (err) {
      console.error("confirm sign in error: ", err);
    }
  };

  const handleSignOut = async () => {
    await Auth.signOut();
    setAuthState("not signed in");
    getCurrentUser();
  };

  const promptUser = (e) => {
    const answer = prompt(
      "Are you SURE you want to delete your account? If so, type your username here:"
    );
    if (answer === null) {
      alert("Whew... that was a close one 😅");
    } else if (answer.toLowerCase() === user.username.toLowerCase()) {
      alert("Sorry to see you go... bon voyage 👋");
      handleDeleteUser();
    } else {
      alert(
        "The username you typed didn't match. Try again... or reconsider? 🥺."
      );
      promptUser(e);
    }
  };

  const handleDeleteUser = async () => {
    try {
      const result = await Auth.deleteUser();
      if (result === "SUCCESS") {
        getCurrentUser();
      }
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
      case "confirm-sign-in":
        handleConfirmSignIn(form);
        break;
      case "sign-out":
        handleSignOut();
        break;
      default:
        console.log("default... do nothing");
    }
  };

  const handleSetupTOTP = async (cognitoUser = user) => {
    return new Promise(async (resolve, reject) => {
      if (qrCode) {
        setQrCode("");
        reject("totp fail");
      }
      try {
        if (!cognitoUser || !cognitoUser.username) {
          throw new Error("Setup TOTP error: no `cognitoUser` present.");
        }

        const code = await Auth.setupTOTP(cognitoUser);

        console.log({ code });

        const generatedQrCodeValue = `otpauth://totp/AWSCognito:${cognitoUser.username}?secret=${code}&issuer=${cognitoUser.issuer}`;
        setQrCode(generatedQrCodeValue);
        resolve("totp success");
      } catch (err) {
        reject(`totp fail: ${err}`);
        console.error("setup TOTP error: ", err);
      }
    });
  };

  const handleVerifyTOTP = async (e) => {
    e.preventDefault();

    const form = new FormData(e.target);
    const challengeAnswer = form.get("TOTPcode");

    try {
      if (!user || !challengeAnswer) {
        throw new Error(
          "Verify TOTP error: no `user` or `challengeAnswer` present."
        );
      }

      const verifyResult = await Auth.verifyTotpToken(user, challengeAnswer);
      // TODO: wrap with logic to check if this isn't the preferred method already
      const setPreferredResult = await Auth.setPreferredMFA(user, "TOTP");

      console.log({ verifyResult, setPreferredResult });
    } catch (err) {
      console.error("verifyTOTP error: ", err);
    }
  };

  if (pageProps.protected && !user) {
    return <div>Loading...</div>;
  }

  return (
    <UserContext.Provider
      value={{ user, authenticated: user?.signInUserSession ? true : false }}
    >
      {/* TODO: abstract the header & auth logic to its own component */}
      <header className={styles.navBar}>
        {/* site title */}
        <Link href="/">
          <a className={styles.siteTitle}>Amplify x Next Super App</a>
        </Link>

        {!user?.signInUserSession ? (
          // not signed in
          <div>
            <div className={styles.authContainer}>
              <h3>Sign In / Sign Up</h3>
              <details className={styles.authDropdown}>
                <summary className={styles.dropdownLabel}></summary>
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
                              <label
                                className={styles.radioLabel}
                                htmlFor={`${methodEncoded}-radio`}
                              >
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
                  {authState === "awaiting-verification" && (
                    <input
                      type="text"
                      id="code"
                      name="code"
                      placeholder="Code"
                      className={`${styles.authInput} ${styles.authInputCode}`}
                    />
                  )}
                  {/* auth submit btn */}
                  <input
                    type="submit"
                    value={authMethod.replace(/-/g, " ")}
                    className={styles.authAction}
                  />
                  <span className={styles.buttonDivider}>or</span>
                  {/* social sign in btn */}
                  <div>
                    <button
                      className={`${styles.authAction} ${styles.authActionGoogle}`}
                      onClick={() =>
                        Auth.federatedSignIn({
                          provider: CognitoHostedUIIdentityProvider.Google,
                        })
                      }
                    >
                      Continue with Google →
                    </button>
                  </div>
                </form>
              </details>
            </div>
          </div>
        ) : (
          // signed in - show account controls
          <div>
            <div className={styles.userContainer}>
              <h3>Welcome, {user.username}!</h3>
              <details className={styles.userControls} open={false}>
                <summary className={styles.dropdownLabel}></summary>
                <button onClick={handleFetchDevices}>Fetch Devices</button>
                <button onClick={handleRememberDevice}>
                  Remember This Device
                </button>
                <button onClick={handleForgetDevice}>Forget This Device</button>
                <button onClick={handleSetupTOTP}>Setup TOTP</button>
                {/* initial (first-time) setup TOTP flow */}
                {qrCode && (
                  <div className={styles.totpWrapper}>
                    <div className={styles.qrWrapper}>
                      <p>
                        Scan this QR code with your device to obtain the
                        one-time-passowrd, and input the code below.
                      </p>
                      <QRCode value={qrCode} />
                    </div>
                    <form
                      className={styles.verifyTOTPactions}
                      onSubmit={handleVerifyTOTP}
                    >
                      <input
                        className={styles.verifyTOTPinput}
                        type="text"
                        name="TOTPcode"
                        id="TOTPcode"
                        placeholder="Code"
                      />
                      <div className={styles.verifyTOTPactions}>
                        <input
                          className={styles.verifyTOTPsubmit}
                          type="submit"
                          value="Continue →"
                        />
                        <button
                          className={styles.verifyTOTPcancel}
                          onClick={() => {
                            setQrCode("");
                          }}
                        >
                          Cancel
                        </button>
                      </div>
                    </form>
                  </div>
                )}
                <button onClick={promptUser}>Delete Your Account</button>
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
