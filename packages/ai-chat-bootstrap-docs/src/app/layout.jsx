import { Footer, Layout, Navbar } from "nextra-theme-docs";
import "nextra-theme-docs/style.css";
// Global styles (imports tokens, tailwind, ai-chat bootstrap utilities)
import "./globals.css";
import { Head } from "nextra/components";
import { getPageMap } from "nextra/page-map";
import { Space_Grotesk } from "next/font/google";

export const metadata = {
  // Define your metadata here
  // For more information on metadata API, see: https://nextjs.org/docs/app/building-your-application/optimizing/metadata
};

const imageStyle = {
  height: 32,
  width: 'auto',
}

const displayFont = Space_Grotesk({
  subsets: ["latin"],
  weight: ["500", "600"],
});

const navbar = (
  <Navbar
    logo={
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <img src={`${process.env.NODE_ENV === 'production' ?
          +  '/ai-chat-bootstrap' : ''}/acb.png`} alt="AI Chat Bootstrap" style={imageStyle} />
  <span className={displayFont.className} style={{ fontWeight: 600, fontSize: 16 }}>ai chat bootstrap</span>
      </div>
    }
    projectLink="https://github.com/knifeyspoony/ai-chat-bootstrap"
    // ... Your additional navbar options
  />
);
const footer = <Footer>MIT {new Date().getFullYear()} © knifeyspoony.</Footer>;

export default async function RootLayout({ children }) {
  return (
    <html
      // Not required, but good for SEO
      lang="en"
      // Required to be set
      dir="ltr"
      // Suggested by `next-themes` package https://github.com/pacocoursey/next-themes#with-app
      suppressHydrationWarning
    >
      <Head
      // ... Your additional head options
      >
        {/* Your additional tags should be passed as `children` of `<Head>` element */}
      </Head>
      <body>
        <Layout
          navbar={navbar}
          pageMap={await getPageMap()}
          docsRepositoryBase="https://github.com/knifeyspoony/ai-chat-bootstrap/tree/main/packages/ai-chat-bootstrap-docs"
          footer={footer}
          darkMode={false}
          sidebar={{
            toggleButton: false
          }}
        >
          {children}
        </Layout>
      </body>
    </html>
  );
}
