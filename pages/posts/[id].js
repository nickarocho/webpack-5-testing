// Next/React
import Head from "next/head";
import { useRouter } from "next/router";
import { useState } from "react";
import { useUser } from "../../components/user";

// Amplify
import { Amplify, DataStore, withSSRContext } from "aws-amplify";
import { serializeModel } from "@aws-amplify/datastore/ssr";
import awsExports from "../../src/aws-exports";
import { Post } from "../../src/models";

// Styles
import styles from "../../styles/Home.module.css";

Amplify.configure({ ...awsExports, ssr: true });

export async function getStaticPaths() {
  const { DataStore } = withSSRContext();
  const posts = await DataStore.query(Post);
  const paths = posts.map((post) => ({ params: { id: post.id } }));

  return {
    fallback: true,
    paths,
  };
}

export async function getStaticProps({ params }) {
  const { DataStore } = withSSRContext();
  const { id } = params;
  const post = await DataStore.query(Post, id);

  return {
    props: {
      post: serializeModel(post),
    },
  };
}

export default function PostComponent({ post }) {
  const router = useRouter();
  const [isEditing, setIsEditing] = useState(false);
  const { user, authenticated } = useUser();
  const isPostOwner = user?.username === post?.owner && authenticated;

  async function handleDelete() {
    try {
      const toDelete = await DataStore.query(Post, post.id);
      await DataStore.delete(toDelete);

      router.push("/");
    } catch (err) {
      console.error(err);
      throw new Error(err);
    }
  }

  async function handleUpdate(e) {
    e.preventDefault();
    const form = new FormData(e.target);

    const updatedPost = {
      id: post.id,
      title: form.get("title"),
      content: form.get("content"),
    };

    try {
      const original = await DataStore.query(Post, post.id);
      await DataStore.save(
        Post.copyOf(original, (updated) => {
          Object.assign(updated, updatedPost);
        })
      );

      setIsEditing(false);
      // lazy UX fix... should re-render based on the result of the mutation
      router.push("/");
    } catch (err) {
      console.error("Error updating post: ", err);
    }
  }

  if (router.isFallback) {
    return (
      <div className={styles.container}>
        <h1 className={styles.title}>Loading&hellip;</h1>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <Head>
        <title>{post?.title} - Amplify + Next.js</title>
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <main className={styles.main}>
        {isEditing ? (
          <>
            <form onSubmit={handleUpdate}>
              <fieldset>
                <legend>Title</legend>
                <input defaultValue={post?.title} name="title" />
              </fieldset>

              <fieldset>
                <legend>Content</legend>
                <textarea defaultValue={post?.content} name="content" />
              </fieldset>

              <button>Update Post</button>
            </form>
          </>
        ) : (
          <>
            <h1 className={styles.title}>{post?.title}</h1>
            <h3 className={styles.description}>By: {post?.owner}</h3>
            <p className={styles.description}>{post?.content}</p>
          </>
        )}

        {isPostOwner && (
          <div>
            <input
              type="checkbox"
              name="editPost"
              id="editPost"
              onChange={(e) => setIsEditing(e.target.checked)}
            />
            <label htmlFor="editPost">Edit this post</label>
            <button onClick={handleDelete}>💥 Delete post</button>
          </div>
        )}
      </main>
    </div>
  );
}
