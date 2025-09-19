import { Footer, Layout, Navbar } from "nextra-theme-docs";
import "nextra-theme-docs/style.css";
import "./globals.css";
import { Head } from "nextra/components";
import { getPageMap } from "nextra/page-map";
import {
  Space_Grotesk,
  Geist,
  Geist_Mono,
  Oxanium,
  Merriweather,
  Fira_Code,
} from "next/font/google";

import { DocsThemeSelect } from "../components/DocsThemeSelect";

export const metadata = {
  title: "AI Chat Bootstrap",
  description: "React UI primitives + hooks for building modern AI chat interfaces quickly. Overview, install options, theming, and core features.",
  icons: {
    icon: [
      {
        url: `${process.env.NODE_ENV === 'production' ? '/ai-chat-bootstrap' : ''}/acb.png`,
        sizes: '32x32',
        type: 'image/png',
      },
      {
        url: `${process.env.NODE_ENV === 'production' ? '/ai-chat-bootstrap' : ''}/acb.png`,
        sizes: '16x16',
        type: 'image/png',
      },
    ],
    apple: `${process.env.NODE_ENV === 'production' ? '/ai-chat-bootstrap' : ''}/acb.png`,
  },
};

const imageStyle = {
  height: 32,
  width: 'auto',
}

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const oxanium = Oxanium({
  variable: "--font-oxanium",
  subsets: ["latin"],
});

const merriweather = Merriweather({
  variable: "--font-merriweather",
  subsets: ["latin"],
  weight: ["300", "400", "700", "900"],
});

const firaCode = Fira_Code({
  variable: "--font-fira-code",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
});

const displayFont = Space_Grotesk({
  subsets: ["latin"],
  weight: ["500", "600"],
});

const navbar = (
  <Navbar
    logo={
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <img src={`${process.env.NODE_ENV === 'production' ? '/ai-chat-bootstrap' : ''}/acb.png`} alt="AI Chat Bootstrap" style={imageStyle} />
  <span className={displayFont.className} style={{ fontWeight: 600, fontSize: 16 }}>ai chat bootstrap</span>
      </div>
    }
    projectLink="https://github.com/knifeyspoony/ai-chat-bootstrap"
    children={<DocsThemeSelect />}
  />
);
const footer = <Footer>MIT {new Date().getFullYear()} © knifeyspoony.</Footer>;

export default async function RootLayout({ children }) {
  return (
    <html
      lang="en"
      dir="ltr"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} ${oxanium.variable} ${merriweather.variable} ${firaCode.variable}`}
    >
      <Head
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
