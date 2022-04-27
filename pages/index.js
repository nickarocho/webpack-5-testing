// pages/index.js
import { Radio, RadioGroupField } from "@aws-amplify/ui-react";
import "@aws-amplify/ui-react/styles.css";
import { Auth } from "aws-amplify";
import { Hub, Logger } from "aws-amplify";
import { useState, useEffect } from "react";

export default function Home() {
  useEffect(() => {
    getCurrentUser();

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

  const methods = ["sign in", "sign up"];
  const [authMethod, setAuthMethod] = useState("sign in");
  const [authState, setAuthState] = useState("not signed in");
  const [user, setUser] = useState(null);

  const getCurrentUser = async () => {
    try {
      const user = await Auth.currentAuthenticatedUser();
      console.log({ user });
      if (user) {
        setAuthMethod("sign out");
        setAuthState("signed in!");
      }
      return user;
    } catch (err) {
      setAuthState("not signed in");
      console.error("getCurrentUser error: ", err);
    }
  };

  const handleRadioSelection = (e) => {
    const selection = e.target.value;
    setAuthMethod(selection);
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
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    const form = new FormData(e.target);

    switch (authMethod) {
      case "sign in":
        handleSignIn(form);
        break;
      case "sign up":
        handleSignUp(form);
        break;
      case "confirm sign up":
        handleConfirmSignUp(form);
        break;
      case "sign out":
        handleSignOut();
        break;
      default:
        console.log("default... do nothing");
    }
  };

  return (
    <main>
      <h1>Next.js App</h1>
      <h3>{authState}</h3>
      <RadioGroupField
        label="Auth Method:"
        name="shugo-sign-in-options"
        defaultValue={methods[0]}
        direction="row"
      >
        {methods.map((option) => (
          <Radio
            selected={authMethod === option}
            key={option}
            value={option}
            onChange={handleRadioSelection}
          >
            {option}
          </Radio>
        ))}
      </RadioGroupField>

      <form onSubmit={handleSubmit}>
        {(authState === "not signed in" ||
          authState === "sign in" ||
          authState === "sign up") && (
          <>
            <input
              type="text"
              id="username"
              name="username"
              placeholder="Username"
            />
            <input
              type="password"
              id="password"
              name="password"
              placeholder="Password"
            />
          </>
        )}
        {authState === "awaiting verification" && (
          <>
            <input type="text" id="code" name="code" placeholder="code" />
          </>
        )}
        <input type="submit" value={authMethod} />
      </form>
    </main>
  );
}
