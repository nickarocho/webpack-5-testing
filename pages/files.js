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

  const [files, setFiles] = useState([]);

  useEffect(() => {
    fetchFiles();
  }, []);

  async function fetchFiles() {
    try {
      Storage.list("")
        .then((result) => setFiles(result))
        .catch((err) => console.log({ err }));
    } catch (err) {
      console.error("fetchFiles error: ", err);
    }
  }

  const handleUploadFile = async (e) => {
    e.preventDefault();

    try {
      // upload the file
      const form = new FormData(e.target);
      const file = form.get("file");
      await Storage.put(file.name, file);

      // refresh the list of files
      fetchFiles();

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
              <code className={styles.code}>{files.length}</code>
              files uploaded
            </p>
          </div>

          <div className={styles.row}>
            {files.map((file) => (
              <div
                className={styles.column}
                key={Math.ceil(Math.random() * Date.now())}
              >
                <div className={styles.card}>
                  <h3>{file.key}</h3>
                  <code>{convertBytesToSize(file.size)}</code>
                  <br />
                  <div>
                    <button onClick={() => handleDownload(file.key)}>
                      Download ⬇
                    </button>
                  </div>
                </div>
              </div>
            ))}
            <div className={styles.column}>
              <div className={styles.card}>
                <h3>✏️ New File</h3>
                <form onSubmit={handleUploadFile} encType="multipart/form-data">
                  <div>
                    <label htmlFor="file">Choose file to upload</label>
                    <input type="file" id="file" name="file" multiple />
                  </div>
                  <div>
                    <button>Upload</button>
                  </div>
                </form>
              </div>
            </div>
          </div>
          <footer>footer...</footer>
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
