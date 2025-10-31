
import Head from 'next/head';
import SignIn from '../components/auth/sigin-in';

export default function Home() {
   return (
    <>
      <Head>
        <title>AZ-Genes - Secure Genetic Data Management on Blockchain</title>
        <meta name="description" content="Secure, personalized genetic and health data storage and management solutions powered by Hedera blockchain technology" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
        {/* Navigation */}
        <nav className="bg-white shadow-lg">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between h-16">
              <div className="flex items-center">
                <div className="flex-shrink-0 flex items-center">
                  <span className="text-2xl font-bold text-indigo-600">AZ-Genes</span>
                </div>
              </div>
              <div className="flex items-center space-x-8">
                <a href="#features" className="text-gray-700 hover:text-indigo-600 px-3 py-2 text-sm font-medium">Features</a>
                <a href="#solutions" className="text-gray-700 hover:text-indigo-600 px-3 py-2 text-sm font-medium">Solutions</a>
                <a href="/sign-in" className="bg-indigo-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-indigo-700">Get Started</a>
              </div>
            </div>
          </div>
        </nav>

        {/* Hero Section */}
        <section className="py-20 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center">
              <h1 className="text-4xl md:text-6xl font-bold text-gray-900 mb-6">
                Secure Your Genetic Future with
                <span className="text-indigo-600"> Blockchain</span>
              </h1>
              <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
                AZ-Genes provides a B2B SaaS platform leveraging Hedera blockchain technology 
                for secure, private storage and management of genetic and health data.
              </p>
              <div className="flex justify-center space-x-4">
                <a href='/sign-in' className="bg-indigo-600 text-white px-8 py-3 rounded-lg font-semibold hover:bg-indigo-700 transition duration-300">
                  Start Free Trial
                </a>
                <button className="border border-indigo-600 text-indigo-600 px-8 py-3 rounded-lg font-semibold hover:bg-indigo-50 transition duration-300">
                  Learn More
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section id="features" className="py-20 bg-gray-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
                Revolutionary Features
              </h2>
              <p className="text-xl text-gray-600">
                Powered by Hedera Network Blockchain Technology
              </p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              {/* Feature 1 */}
              <div className="bg-white p-8 rounded-xl shadow-lg hover:shadow-xl transition duration-300">
                <div className="w-12 h-12 bg-indigo-100 rounded-lg flex items-center justify-center mb-4">
                  <svg className="w-6 h-6 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-3">NFT-Certified Data Storage</h3>
                <p className="text-gray-600">
                  Your genetic and health data is securely stored and certified through non-fungible tokens (NFTs), 
                  ensuring authenticity and ownership.
                </p>
              </div>

              {/* Feature 2 */}
              <div className="bg-white p-8 rounded-xl shadow-lg hover:shadow-xl transition duration-300">
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-4">
                  <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-3">Controlled Data Sharing</h3>
                <p className="text-gray-600">
                  Share your data seamlessly with family, clinicians, and researchers while maintaining complete control 
                  over access permissions.
                </p>
              </div>

              {/* Feature 3 */}
              <div className="bg-white p-8 rounded-xl shadow-lg hover:shadow-xl transition duration-300">
                <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-4">
                  <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-3">Utility Token Economy</h3>
                <p className="text-gray-600">
                  Professionals earn tokens for uploading client data and use tokens to access historical records. 
                  Create a sustainable ecosystem for genetic data exchange.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Solutions Section */}
        <section id="solutions" className="py-20 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
                Tailored Solutions
              </h2>
              <p className="text-xl text-gray-600">
                Serving Individuals, Professionals, and Institutions
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-8">
              {/* Solution 1 - Individuals */}
              <div className="bg-gradient-to-br from-indigo-500 to-purple-600 text-white p-8 rounded-xl shadow-lg">
                <h3 className="text-2xl font-bold mb-4">For Individuals & Families</h3>
                <ul className="space-y-3">
                  <li className="flex items-start">
                    <span className="mr-2">✓</span>
                    <span>Secure personal genetic data storage with NFT certification</span>
                  </li>
                  <li className="flex items-start">
                    <span className="mr-2">✓</span>
                    <span>Controlled sharing with healthcare providers</span>
                  </li>
                  <li className="flex items-start">
                    <span className="mr-2">✓</span>
                    <span>Family health history management</span>
                  </li>
                </ul>
              </div>

              {/* Solution 2 - Professionals */}
              <div className="bg-gradient-to-br from-blue-500 to-cyan-600 text-white p-8 rounded-xl shadow-lg">
                <h3 className="text-2xl font-bold mb-4">For Healthcare Professionals</h3>
                <ul className="space-y-3">
                  <li className="flex items-start">
                    <span className="mr-2">✓</span>
                    <span>Earn utility tokens for uploading client data</span>
                  </li>
                  <li className="flex items-start">
                    <span className="mr-2">✓</span>
                    <span>NFT professional certification</span>
                  </li>
                  <li className="flex items-start">
                    <span className="mr-2">✓</span>
                    <span>Access comprehensive client health history</span>
                  </li>
                </ul>
              </div>

              {/* Solution 3 - Institutions */}
              <div className="bg-gradient-to-br from-green-500 to-emerald-600 text-white p-8 rounded-xl shadow-lg">
                <h3 className="text-2xl font-bold mb-4">For Research Institutions</h3>
                <ul className="space-y-3">
                  <li className="flex items-start">
                    <span className="mr-2">✓</span>
                    <span>NFT institutional certification</span>
                  </li>
                  <li className="flex items-start">
                    <span className="mr-2">✓</span>
                    <span>Anonymous access to data pool for analytics</span>
                  </li>
                  <li className="flex items-start">
                    <span className="mr-2">✓</span>
                    <span>Pay with utility tokens for data access</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* Technology Section */}
        <section className="py-20 bg-gray-900 text-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-bold mb-4">
                Powered by Hedera Network
              </h2>
              <p className="text-xl text-gray-300">
                Leveraging enterprise-grade blockchain for unmatched security and performance
              </p>
            </div>
            
            <div className="grid md:grid-cols-2 gap-12 items-center">
              <div>
                <h3 className="text-2xl font-bold mb-6">Why Hedera?</h3>
                <ul className="space-y-4">
                  <li className="flex items-start">
                    <span className="mr-3 text-green-400">●</span>
                    <span>High throughput with low, predictable fees</span>
                  </li>
                  <li className="flex items-start">
                    <span className="mr-3 text-green-400">●</span>
                    <span>Energy-efficient proof-of-stake consensus</span>
                  </li>
                  <li className="flex items-start">
                    <span className="mr-3 text-green-400">●</span>
                    <span>Enterprise-grade security and stability</span>
                  </li>
                  <li className="flex items-start">
                    <span className="mr-3 text-green-400">●</span>
                    <span>Carbon-negative network</span>
                  </li>
                </ul>
              </div>
              <div className="bg-gray-800 p-8 rounded-xl">
                <h4 className="text-xl font-semibold mb-4">Blockchain Benefits</h4>
                <p className="text-gray-300 mb-4">
                  Our integration with Hedera ensures your genetic data remains:
                </p>
                <ul className="space-y-2 text-gray-300">
                  <li>• Immutable and tamper-proof</li>
                  <li>• Transparent yet private</li>
                  <li>• Instantly verifiable</li>
                  <li>• Globally accessible with permission</li>
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section id="contact" className="py-20 bg-indigo-600 text-white">
          <div className="max-w-4xl mx-auto text-center px-4 sm:px-6 lg:px-8">
            <h2 className="text-3xl md:text-4xl font-bold mb-6">
              Ready to Secure Your Genetic Data?
            </h2>
            <p className="text-xl text-indigo-100 mb-8">
              Join the future of personalized healthcare data management today.
            </p>
            <div className="flex flex-col sm:flex-row justify-center space-y-4 sm:space-y-0 sm:space-x-4">
              <button className="bg-white text-indigo-600 px-8 py-3 rounded-lg font-semibold hover:bg-gray-100 transition duration-300">
                Start Free Trial
              </button>
              <button className="border border-white text-white px-8 py-3 rounded-lg font-semibold hover:bg-indigo-700 transition duration-300">
                Schedule Demo
              </button>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="bg-gray-800 text-white py-12">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid md:grid-cols-4 gap-8">
              <div>
                <h3 className="text-xl font-bold mb-4">AZ-Genes</h3>
                <p className="text-gray-400">
                  Secure genetic data management powered by Hedera blockchain.
                </p>
              </div>
              <div>
                <h4 className="font-semibold mb-4">Product</h4>
                <ul className="space-y-2 text-gray-400">
                  <li><a href="#" className="hover:text-white">Features</a></li>
                  <li><a href="#" className="hover:text-white">Solutions</a></li>
                  <li><a href="#" className="hover:text-white">Pricing</a></li>
                </ul>
              </div>
              <div>
                <h4 className="font-semibold mb-4">Company</h4>
                <ul className="space-y-2 text-gray-400">
                  <li><a href="#" className="hover:text-white">About</a></li>
                  <li><a href="#" className="hover:text-white">Blog</a></li>
                  <li><a href="#" className="hover:text-white">Careers</a></li>
                </ul>
              </div>
              <div>
                <h4 className="font-semibold mb-4">Legal</h4>
                <ul className="space-y-2 text-gray-400">
                  <li><a href="#" className="hover:text-white">Privacy</a></li>
                  <li><a href="#" className="hover:text-white">Terms</a></li>
                  <li><a href="#" className="hover:text-white">Security</a></li>
                </ul>
              </div>
            </div>
            <div className="border-t border-gray-700 mt-8 pt-8 text-center text-gray-400">
              <p>&copy; 2024 AZ-Genes. All rights reserved.</p>
            </div>
          </div>
        </footer>
      </div>
    </>
  );
}
