import Feature from "../components/Feature";
import Testimonials from "../components/Testimonials";
import Hero from "../components/Hero";
import Layout from "../components/Layout/Layout";
import SeoHead from "../components/SeoHead";

export default function Home() {
  return (
    <>
      <SeoHead title='LaslesVPN Landing Page' />
      <Layout>
        <Hero />
        <Feature />
        <Testimonials />
      </Layout>
    </>
  );
}
