import Feature from "../components/Feature";
import Testimonials from "../components/Testimonials";
import QuoteSection from "../components/QuoteSection";
import Hero from "../components/Hero";
import Layout from "../components/Layout/Layout";
import SeoHead from "../components/SeoHead";
import FAQs from "../components/FAQs";

export default function Home() {
  return (
    <>
      <SeoHead />
      <Layout>
        <Hero />
        <Feature />
        <Testimonials />
        <FAQs />
        <QuoteSection />
      </Layout>
    </>
  );
}
