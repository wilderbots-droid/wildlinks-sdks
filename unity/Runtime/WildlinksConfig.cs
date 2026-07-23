using System;
using System.Collections.Generic;

namespace Wilderbots.Wildlinks
{
    [Serializable]
    public sealed class WildlinksConfig
    {
        public string BaseUrl;
        public List<string> Domains = new List<string>();
        public string ApiKey;

        public WildlinksConfig(string baseUrl, IEnumerable<string> domains, string apiKey = null)
        {
            BaseUrl = baseUrl;
            Domains = domains == null ? new List<string>() : new List<string>(domains);
            ApiKey = apiKey;
        }
    }
}
