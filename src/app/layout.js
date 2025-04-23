import "./globals.css";

import Background from "@/components/Background";
import { ClerkProviderWrapper } from "./clerk-provider";
import ReactQueryProvider from "@/components/providers/ReactQueryProvider";
import Blop from "@/components/Blop";

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-white text-gray-900">

        {/* <Blop centerX={100} centerY={900}/> */}
        {/* <Background/>   */}
        <ReactQueryProvider>
         <ClerkProviderWrapper>{children}</ClerkProviderWrapper>
        </ReactQueryProvider>
      </body>
    </html>
  );
}