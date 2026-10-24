import './globals.css';

export const metadata = {
  title: 'House Bill Tracker',
  description: 'Monthly electricity, rent and gas receipts saved to Google Sheets',
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
