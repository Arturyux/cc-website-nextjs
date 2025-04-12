import "./globals.css";
import Header from "@/components/Header";
import Background from "@/components/Background";
import { ClerkProviderWrapper } from "./clerk-provider";

export const metadata = {
  title: "My Next.js App",
  description: "An app with Clerk, Framer Motion and i18next integration",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-white text-gray-900">
        <Header />
        <Background/>  
        <ClerkProviderWrapper>{children}</ClerkProviderWrapper>
      </body>
    </html>
  );
}