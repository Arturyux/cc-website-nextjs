import "./globals.css";
import Header from "@/components/Header";
import Background from "@/components/Background";
import { ClerkProviderWrapper } from "./clerk-provider";

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