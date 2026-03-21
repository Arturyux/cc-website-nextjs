/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ["ssh2-sftp-client", "ssh2"],
    serverActions: {
      bodySizeLimit: '50mb',
    },
  },
};
export default nextConfig;