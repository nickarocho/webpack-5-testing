// Amplify
import { DataStore, Storage } from "aws-amplify";
// import { File } from "../src/models";

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

  const [publicFiles, setPublicFiles] = useState([]);
  const [privateFiles, setPrivateFiles] = useState([]);

  useEffect(() => {
    fetchPublicFiles();
    fetchPrivateFiles();
  }, []);

  async function fetchPublicFiles() {
    try {
      Storage.list("")
        .then((result) => setPublicFiles(result))
        .catch((err) => console.log({ err }));
    } catch (err) {
      console.error("fetchPublicFiles error: ", err);
    }
  }

  async function fetchPrivateFiles() {
    try {
      Storage.list("", { level: "private" })
        .then((result) => setPrivateFiles(result))
        .catch((err) => console.log({ err }));
    } catch (err) {
      console.error("fetchPrivateFiles error: ", err);
    }
  }

  const handleUploadFile = async (e) => {
    e.preventDefault();

    try {
      // upload the file
      const form = new FormData(e.target);
      const file = form.get("file");
      const fileName = form.get("fileName");
      const isPrivate = form.get("isPrivate");

      const level = isPrivate ? "private" : "public";

      await Storage.put(fileName, file, {
        level: level,
      });

      // refresh the list of public files
      fetchPublicFiles();
      fetchPrivateFiles();

      // clear the 'New file' input to prep another upload
      e.target.file.value = "";
    } catch (err) {
      console.error(err);
    }
  };

  const downloadBlob = (blob, filename) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename || "download";
    const clickHandler = () => {
      setTimeout(() => {
        URL.revokeObjectURL(url);
        a.removeEventListener("click", clickHandler);
      }, 150);
    };
    a.addEventListener("click", clickHandler, false);
    a.click();
    return a;
  };

  const handleDownload = async (fileKey) => {
    try {
      const blob = await Storage.get(fileKey, { download: true });
      downloadBlob(blob.Body, fileKey);
    } catch (err) {
      console.error("file download error: ", err);
    }
  };

  const handleCopy = async (fileKey) => {
    try {
      const result = await Storage.copy(
        { key: fileKey },
        { key: `copied/${fileKey}` }
      );
      console.log("copy result: ", result);
    } catch (err) {}
  };

  const handleRemove = async (fileKey) => {
    try {
      const result = await Storage.remove(fileKey);
      console.log("remove result: ", result);
      fetchPublicFiles();
    } catch (err) {}
  };

  function convertBytesToSize(bytes) {
    var sizes = ["Bytes", "KB", "MB", "GB", "TB"];
    if (bytes == 0) return "n/a";
    var i = parseInt(Math.floor(Math.log(bytes) / Math.log(1024)));
    return Math.round(bytes / Math.pow(1024, i)) + " " + sizes[i];
  }

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
              files
              <code className={styles.code}>
                ({publicFiles.length + privateFiles.length} total)
              </code>
            </p>
          </div>
          <div className={styles.column}>
            <div className={`${styles.card} ${styles.newFileCard}`}>
              <h3>⤴️ Upload a new file</h3>
              <form onSubmit={handleUploadFile} encType="multipart/form-data">
                <div className={styles.formWrapper}>
                  <div>
                    <label className={styles.uploadFileInput} htmlFor="file">
                      🔎 Select a file
                    </label>
                    <input
                      type="file"
                      id="file"
                      name="file"
                      className={styles.uploadFileDefaultInput}
                      onChange={(e) => {
                        const fileNameInput =
                          document.querySelector("#fileName");
                        fileNameInput.value = e.target.files[0].name;
                        fileNameInput.disabled = false;
                      }}
                    />
                  </div>
                  <div>
                    <label htmlFor="file">File name:</label>
                    <input
                      disabled
                      type="text"
                      id="fileName"
                      className={styles.fileNameInput}
                      name="fileName"
                    />
                  </div>
                  <div>
                    <label htmlFor="file">Private? </label>
                    <input
                      type="checkbox"
                      id="isPrivate"
                      name="isPrivate"
                      defaultChecked={true}
                    />
                  </div>
                </div>
                <hr />
                <div>
                  <button className={`${styles.uiButton} ${styles.primary}`}>
                    Upload ⤴️
                  </button>
                </div>
              </form>
            </div>
          </div>

          <div className={`${styles.rowTitle} ${styles.row}`}>
            <p>
              <code className={styles.code}>{publicFiles.length}</code>
              public files uploaded
            </p>
          </div>

          <div className={styles.row}>
            {publicFiles.map((file) => (
              <div
                className={styles.column}
                key={Math.ceil(Math.random() * Date.now())}
              >
                <div className={styles.card}>
                  <h3>{file.key}</h3>
                  <code>{convertBytesToSize(file.size)}</code>
                  <br />
                  <div>
                    <button
                      className={styles.uiButton}
                      onClick={() => handleDownload(file.key)}
                    >
                      Download ⤵️
                    </button>
                    <button
                      className={styles.uiButton}
                      onClick={() => handleCopy(file.key)}
                    >
                      Copy 👯‍♀️
                    </button>
                    <button
                      className={styles.uiButton}
                      onClick={() => handleRemove(file.key)}
                    >
                      Remove 🗑
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className={`${styles.rowTitle} ${styles.row}`}>
            <p>
              <code className={styles.code}>{privateFiles.length}</code>
              private files uploaded
            </p>
          </div>

          <div className={styles.row}>
            {privateFiles.map((file) => (
              <div
                className={styles.column}
                key={Math.ceil(Math.random() * Date.now())}
              >
                <div className={styles.card}>
                  <h3>{file.key}</h3>
                  <code>{convertBytesToSize(file.size)}</code>
                  <br />
                  <div>
                    <button
                      className={styles.uiButton}
                      onClick={() => handleDownload(file.key)}
                    >
                      Download ⬇
                    </button>
                    <button
                      className={styles.uiButton}
                      onClick={() => handleCopy(file.key)}
                    >
                      Copy 👯‍♀️
                    </button>
                    <button
                      className={styles.uiButton}
                      onClick={() => handleRemove(file.key)}
                    >
                      Remove 🗑
                    </button>
                  </div>
                </div>
              </div>
            ))}
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
