import Head from "next/head";
import { adminRobots } from "../../utils/adminAuth";

export default function AdminRobotsHead() {
  return (
    <Head>
      <meta name="robots" content={`${adminRobots.index ? "index" : "noindex"}, ${adminRobots.follow ? "follow" : "nofollow"}`} key="robots" />
    </Head>
  );
}
