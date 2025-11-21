import { Link } from 'react-router-dom';
import { ProductDescriptionAI } from '../components/ai/ProductDescriptionAI';
import { EmailAIGenerator } from '../components/ai/EmailAIGenerator';
import { SupportAIReply } from '../components/ai/SupportAIReply';
import { AnalyticsAIInsights } from '../components/ai/AnalyticsAIInsights';
import { useAIContext } from '../../contexts/AIContext';
import { FiSettings } from 'react-icons/fi';

export function AIToolsPage() {
  const { settings, loading, error } = useAIContext();

  if (loading) {
    return <div className="animate-pulse h-12 bg-gray-100 rounded" />;
  }

  if (error) {
    return <p className="text-sm text-red-600">Unable to load AI settings: {error}</p>;
  }

  const allDisabled = !(
    settings?.adminTools.productDescription ||
    settings?.adminTools.productFAQ ||
    settings?.adminTools.emailGenerator ||
    settings?.adminTools.supportReplies ||
    settings?.adminTools.analytics
  );

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">AI Studio</h1>
          <p className="text-sm text-gray-600">
            Boost your merchandising, support, and marketing with safe on-platform AI helpers.
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <Link
            to="/admin/ai/settings"
            className="inline-flex items-center px-4 py-2 bg-gray-100 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-200 transition-colors"
          >
            <FiSettings className="w-4 h-4 mr-2" />
            Settings
          </Link>
          <div className="px-3 py-1 text-xs rounded-full bg-primary-50 text-primary-700 font-semibold">
            {settings?.enabled ? 'AI Enabled' : 'Disabled'}
          </div>
        </div>
      </div>

      {allDisabled ? (
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-6">
          <div className="flex items-center justify-between">
            <p className="text-sm text-yellow-800">
              AI admin tools are disabled. Enable them in AI Settings to get started.
            </p>
            <Link
              to="/admin/ai/settings"
              className="ml-4 inline-flex items-center px-4 py-2 bg-yellow-600 text-white text-sm font-medium rounded-lg hover:bg-yellow-700 transition-colors"
            >
              <FiSettings className="w-4 h-4 mr-2" />
              Open AI Settings
            </Link>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <ProductDescriptionAI />
          <EmailAIGenerator />
          <SupportAIReply />
          <AnalyticsAIInsights />
        </div>
      )}
    </div>
  );
}


