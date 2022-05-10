// Amplify
import { DataStore } from "aws-amplify";
import { Post } from "../src/models";

// Next/React
import Head from "next/head";
import { useEffect, useState } from "react";

// Styles
import styles from "../styles/Home.module.css";
import Link from "next/link";
import { useRouter } from "next/router";
import { useUser } from "../components/user";

export default function Home() {
  const { authenticated } = useUser();
  const router = useRouter();

  const [posts, setPosts] = useState([]);

  useEffect(() => {
    fetchPosts();

    let subscription;

    subscription = DataStore.observe(Post).subscribe(() => fetchPosts());

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  async function fetchPosts() {
    try {
      const postData = await DataStore.query(Post);
      setPosts(postData);
    } catch (err) {
      console.error("fetchPosts error: ", err);
    }
  }

  const handleCreatePost = async (e) => {
    e.preventDefault();

    const form = new FormData(e.target);

    try {
      const post = await DataStore.save(
        new Post({
          title: form.get("title"),
          content: form.get("content"),
        })
      );

      // TODO: decide on the UX... should we route to the post after we create it?
      // router.push(`/posts/${post.id}`);
    } catch (err) {
      console.error(err);
    }
  };

  const handleClearPosts = async () => {
    try {
      await DataStore.clear();
      console.log("DataStore cleared!");
      fetchPosts();
    } catch (err) {
      console.error("DataStore clear error: ", err);
    }
  };

  return (
    <div className={styles.container}>
      <Head>
        <title>Amplify + Next.js</title>
        <link rel="icon" href="/favicon.ico" />
      </Head>

      {/* signed in - show the important content */}
      {authenticated ? (
        <main className={styles.main}>
          <div className={`${styles.rowTitle} ${styles.row}`}>
            <p>
              <code className={styles.code}>{posts.length}</code>
              posts
            </p>
          </div>

          <div className={styles.row}>
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
                  <hr />
                  <button className={`${styles.uiButton} ${styles.primary}`}>
                    Create Post
                  </button>
                </form>
              </div>
            </div>
            {posts
              .map((post) => {
                return (
                  <div
                    className={styles.column}
                    key={Math.ceil(Math.random() * Date.now())}
                  >
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
                );
              })
              .reverse()}
          </div>
          <footer>
            <button onClick={handleClearPosts}>Clear DataStore</button>
          </footer>
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
