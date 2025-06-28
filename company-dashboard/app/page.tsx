import Link from "next/link";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="max-w-md w-full bg-white rounded-lg shadow-md p-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            Company Dashboard
          </h1>
          <p className="text-gray-600 mb-8">
            3D Measurement Management Platform
          </p>
          
          <div className="space-y-4">
            <Link
              href="/login"
              className="block w-full bg-blue-600 text-white py-3 px-4 rounded-md font-medium hover:bg-blue-700 transition-colors"
            >
              Company Login
            </Link>
            
            <div className="text-sm text-gray-500">
              <p>Demo Company:</p>
              <p className="font-mono">acme.localhost:3001</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}