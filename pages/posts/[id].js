// Next/React
import Head from "next/head";
import { useRouter } from "next/router";
import { useState } from "react";
import { useUser } from "../../components/user";

// Amplify
import { Amplify, API, withSSRContext } from "aws-amplify";
import awsExports from "../../src/aws-exports";
import { getPost, listPosts } from "../../src/graphql/queries";
import * as mutations from "../../src/graphql/mutations";

// Styles
import styles from "../../styles/Home.module.css";

Amplify.configure({ ...awsExports, ssr: true });

export async function getStaticPaths() {
  const SSR = withSSRContext();
  const { data } = await SSR.API.graphql({ query: listPosts });
  const paths = data.listPosts.items.map((post) => ({
    params: { id: post.id },
  }));

  return {
    fallback: true,
    paths,
  };
}

export async function getStaticProps({ params }) {
  const SSR = withSSRContext();
  const { data } = await SSR.API.graphql({
    query: getPost,
    variables: {
      id: params.id,
    },
  });

  return {
    props: {
      post: data.getPost,
    },
  };
}

export default function Post({ post }) {
  const router = useRouter();
  const [isEditing, setIsEditing] = useState(false);
  const user = useUser();
  const isPostOwner = user?.username === post.owner;

  if (router.isFallback) {
    return (
      <div className={styles.container}>
        <h1 className={styles.title}>Loading&hellip;</h1>
      </div>
    );
  }

  async function handleDelete() {
    try {
      await API.graphql({
        authMode: "AMAZON_COGNITO_USER_POOLS",
        query: mutations.deletePost,
        variables: {
          input: { id: post.id },
        },
      });

      router.push("/");
    } catch ({ errors }) {
      console.error(...errors);
      throw new Error(errors[0].message);
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
      const result = await API.graphql({
        authMode: "AMAZON_COGNITO_USER_POOLS",
        query: mutations.updatePost,
        variables: { input: updatedPost },
      });
      console.log({ result });
    } catch (err) {
      console.error("Error updating post: ", err);
    }
  }

  return (
    <div className={styles.container}>
      <Head>
        <title>{post.title} - Amplify + Next.js</title>
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <main className={styles.main}>
        {isEditing ? (
          <>
            <form onSubmit={handleUpdate}>
              <fieldset>
                <legend>Title</legend>
                <input defaultValue={post.title} name="title" />
              </fieldset>

              <fieldset>
                <legend>Content</legend>
                <textarea defaultValue={post.content} name="content" />
              </fieldset>

              <button>Update Post</button>
            </form>
          </>
        ) : (
          <>
            <h1 className={styles.title}>{post.title}</h1>
            <h3 className={styles.description}>By: {post.owner}</h3>
            <p className={styles.description}>{post.content}</p>
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
