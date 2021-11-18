import styles from '../styles/Home.module.css'
import Link from "next/link"

export default function Home() {
  return (
    <div className={styles.container}>
      <p>please go to <Link href="/api">/api</Link> page</p>
    </div>
  )
}
