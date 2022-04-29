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
import Link from "next/link";
import { useRouter } from "next/router";
import { useUser } from "../components/user";

export async function getServerSideProps({ req }) {
  const SSR = withSSRContext({ req });
  const response = await SSR.API.graphql({ query: listPosts });

  return {
    props: {
      posts: response.data.listPosts.items,
    },
  };
}

export default function Home({ posts = [] }) {
  const user = useUser();
  const router = useRouter();

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

      router.push(`/posts/${data.createPost.id}`);
    } catch ({ errors }) {
      console.error(...errors);
      throw new Error(errors[0].message);
    }
  };

  return (
    <div className={styles.container}>
      <Head>
        <title>Amplify + Next.js</title>
        <link rel="icon" href="/favicon.ico" />
      </Head>

      {/* signed in - show the important content */}
      {user ? (
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
                  <Link href={`/posts/${post.id}`}>
                    <a>
                      <h3>{post.title}</h3>
                      <p>{post.content}</p>
                      <p className={styles.postOwner}>by: {post.owner}</p>
                    </a>
                  </Link>
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
