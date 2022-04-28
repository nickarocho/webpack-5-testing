import { Radio, RadioGroupField } from "@aws-amplify/ui-react";
import { Auth, API, withSSRContext } from "aws-amplify";
import { CognitoHostedUIIdentityProvider } from "@aws-amplify/auth";
import { Hub, Logger } from "aws-amplify";
import { useState, useEffect } from "react";
import "@aws-amplify/ui-react/styles.css";
import styles from "../styles/Home.module.css";

import Head from "next/head";

import { createPost } from "../src/graphql/mutations";
import { listPosts } from "../src/graphql/queries";

export async function getServerSideProps({ req }) {
  const SSR = withSSRContext({ req });
  const response = await SSR.API.graphql({ query: listPosts });

  console.log({ response });

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

  const methods = ["sign in", "sign up"];
  const [authMethod, setAuthMethod] = useState("sign in");
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
    <div className={styles.container}>
      <main className={styles.main}>
        <Head>
          <title>Amplify + Next.js</title>
          <link rel="icon" href="/favicon.ico" />
        </Head>

        <h1 className={styles.title}>Amplify + Next.js SUPER App 💪</h1>
        <h3>{authState}</h3>
        <h4>user: {user ? user.username : "none"}</h4>

        {authState !== "signed in!" && (
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
        )}

        {/* not signed in */}
        {(authState !== "signed in!" || !user) && (
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
            {/* confirm user code input */}
            {authState === "awaiting verification" && (
              <input type="text" id="code" name="code" placeholder="code" />
            )}
            <input type="submit" value={authMethod} />
            <button
              onClick={() =>
                Auth.federatedSignIn({
                  provider: CognitoHostedUIIdentityProvider.Google,
                })
              }
            >
              Open Google
            </button>
          </form>
        )}
        {/* signed in */}
        {authState === "signed in!" && user && (
          <div>
            <div>
              <div className={`${styles.rowTitle} ${styles.row}`}>
                <h2>Auth stuff</h2>
                <h3>welcome, {user.username}</h3>
              </div>
              <button onClick={handleDeleteUser}>Delete Yo Self</button>
              <button onClick={handleSignOut}>Sign Out</button>
              <button onClick={handleFetchDevices}>Fetch Devices</button>
              <button onClick={handleRememberDevice}>
                Remember This Device
              </button>
              <button onClick={handleForgetDevice}>Forget This Device</button>
            </div>

            <div className={styles.gridContainer}>
              <div className={`${styles.rowTitle} ${styles.row}`}>
                <h2>Datastore stuff</h2>
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
                    <h3>New Post</h3>
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
                      <button type="button" onClick={() => Auth.signOut()}>
                        Sign out
                      </button>
                    </form>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
