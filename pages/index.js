// Amplify
import { AmplifyProvider, Radio, RadioGroupField } from "@aws-amplify/ui-react";
import { Auth, API, withSSRContext } from "aws-amplify";
import { CognitoHostedUIIdentityProvider } from "@aws-amplify/auth";
import { Hub, Logger } from "aws-amplify";
import { createPost } from "../src/graphql/mutations";
import { listPosts } from "../src/graphql/queries";

// Next/React
import { useState, useEffect } from "react";
import Head from "next/head";

// Styles
import styles from "../styles/Home.module.css";

export async function getServerSideProps({ req }) {
  const SSR = withSSRContext({ req });
  const response = await SSR.API.graphql({ query: listPosts });

  return {
    props: {
      posts: response.data.listPosts.items,
    },
  };
}

const handleCreatePost = async (e) => {
  e.preventDefault();

  const form = new FormData(e.target);

  try {
    const { data } = await API.graphql({
      authMode: "AMAZON_COGNITO_USER_POOLS",
      query: createPost,
      variables: {
        input: {
          title: form.get("title"),
          content: form.get("content"),
        },
      },
    });

    window.location.href = `/posts/${data.createPost.id}`;
  } catch ({ errors }) {
    console.error(...errors);
    throw new Error(errors[0].message);
  }
};

export default function Home({ posts = [] }) {
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

  const methods = ["sign-in", "sign-up"];
  const [authMethod, setAuthMethod] = useState("sign-in");
  const [authState, setAuthState] = useState("not signed in");
  const [user, setUser] = useState(null);

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

  const handleSubmit = (e) => {
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

  return (
    <div className={styles.container}>
      <Head>
        <title>Amplify + Next.js</title>
        <link rel="icon" href="/favicon.ico" />
      </Head>

      {/* nav bar w/ full Auth functionality */}
      {/* TODO: abstract to component */}
      <header className={styles.navBar}>
        <p className={styles.siteTitle}>Amplify x Next Super App</p>

        {/* not signed in */}
        {(authState !== "signed in!" || !user) && (
          <div className={styles.authContainer}>
            <details className={styles.authDropdown}>
              <summary>Sign In / Sign Up</summary>
              <div className={styles.authDropdownContent}>
                <form className={styles.authForm} onSubmit={handleSubmit}>
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
        )}
        {authState === "signed in!" && user && (
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
                <button onClick={handleSignOut}>Sign Out</button>
                <button
                  style={{ background: "#ac1515" }}
                  onClick={handleDeleteUser}
                >
                  Delete Your Account
                </button>
              </details>
            </div>
          </div>
        )}
      </header>

      {/* signed in - show the important content */}
      {authState === "signed in!" && user ? (
        <main className={styles.main}>
          <div className={`${styles.rowTitle} ${styles.row}`}>
            <p>
              <code className={styles.code}>{posts.length}</code>
              posts
            </p>
          </div>

          <div className={styles.row}>
            {posts.map((post) => (
              <div className={styles.column} key={post.id}>
                <div className={styles.card}>
                  <a href={`/posts/${post.id}`}>
                    <h3>{post.title}</h3>
                    <p>{post.content}</p>
                  </a>
                </div>
              </div>
            ))}
            <div className={styles.column}>
              <div className={styles.card}>
                <h3>✏️ New Post</h3>
                <form onSubmit={handleCreatePost}>
                  <fieldset>
                    <legend>Title</legend>
                    <input
                      defaultValue={`Today, ${new Date().toLocaleTimeString()}`}
                      name="title"
                    />
                  </fieldset>

                  <fieldset>
                    <legend>Content</legend>
                    <textarea
                      defaultValue="I built an Amplify app with Next.js!"
                      name="content"
                    />
                  </fieldset>

                  <button>Create Post</button>
                </form>
              </div>
            </div>
          </div>
        </main>
      ) : (
        <main className={styles.main}>
          <div className={styles.defaultBody}>
            <h1>not signed in... ✋</h1>
            <h2>Sign in or sign up to see this rad app 👆</h2>
          </div>
        </main>
      )}
    </div>
  );
}
