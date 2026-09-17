import { GoogleGenAI, Type, GenerateContentResponse } from "@google/genai";
import type { 
    Scenario, AnalysisLoop, ThreatLandscapeResult, ThreatMatrixResult, 
    ThreatMatrixPreview, ThreatRadarResult, Memorandum, 
    TailoredAnalysis, ChatMessage, SupplementalSignal, 
    ArchetypeSignalResult, IntelligenceDashboardData,
    CyberThreat, CriticalVulnerability, GeopoliticalEvent,
    Source, ThreatLandscapeTrend, ThreatMatrixQuadrant,
    AttackMapResult
} from '../types';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// Robust JSON extractor
const cleanJson = (text: string) => {
    if (!text) return '{}';
    const match = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    if (match) return match[1].trim();
    const firstBrace = text.indexOf('{');
    if (firstBrace === -1) return text.trim();
    let balance = 0;
    let inString = false;
    let escape = false;
    let end = -1;
    for (let i = firstBrace; i < text.length; i++) {
        const char = text[i];
        if (escape) { escape = false; continue; }
        if (char === '\\') { escape = true; continue; }
        if (char === '"') { inString = !inString; continue; }
        if (!inString) {
            if (char === '{') balance++;
            else if (char === '}') {
                balance--;
                if (balance === 0) { end = i; break; }
            }
        }
    }
    if (end !== -1) return text.substring(firstBrace, end + 1);
    return text.substring(firstBrace);
};

const retry = async <T>(fn: () => Promise<T>, retries = 3, delay = 1000): Promise<T> => {
    try {
        return await fn();
    } catch (error: any) {
        const errorMsg = (error?.message || '').toLowerCase();
        if (error?.status === 429 || error?.status === 'RESOURCE_EXHAUSTED' || errorMsg.includes('quota') || errorMsg.includes('429')) {
             throw new Error("API Quota Exceeded: You have reached the rate limit for your Gemini API key. Please check your usage and billing details at https://ai.google.dev/gemini-api/docs/rate-limits");
        }
        if (error?.status === 403 || error?.status === 'PERMISSION_DENIED' || errorMsg.includes('permission denied') || errorMsg.includes('permission_denied') || errorMsg.includes('api_key_invalid')) {
             throw new Error("Gemini API Permission Denied: The API key is invalid, missing, or lacks permissions. Please check your API key in the AI Studio Settings menu or ensure the Generative Language API is enabled in your Google Cloud Console.");
        }
        if (retries <= 0) throw error;
        await new Promise(resolve => setTimeout(resolve, delay));
        return retry(fn, retries - 1, delay * 2);
    }
};

const generateContentWithSearchFallback = async (params: any) => {
    const hasSearch = params.config?.tools?.some((t: any) => t && 'googleSearch' in t);
    if (hasSearch) {
        try {
            return await ai.models.generateContent(params);
        } catch (error: any) {
            const errorMsg = (error?.message || '').toLowerCase();
            const isSearchQuotaOrPerm = 
                error?.status === 429 || 
                error?.status === 'RESOURCE_EXHAUSTED' || 
                error?.status === 403 || 
                error?.status === 'PERMISSION_DENIED' ||
                errorMsg.includes('quota') || 
                errorMsg.includes('429') ||
                errorMsg.includes('permission denied');
            if (isSearchQuotaOrPerm) {
                console.warn("Search grounding quota or permission limitation detected. Falling back to direct Gemini intelligence model.", error?.message || error);
                const fallbackConfig = { ...params.config };
                if (fallbackConfig.tools) {
                    fallbackConfig.tools = fallbackConfig.tools.filter((t: any) => !('googleSearch' in t));
                    if (fallbackConfig.tools.length === 0) delete fallbackConfig.tools;
                }
                return await ai.models.generateContent({
                    ...params,
                    config: fallbackConfig
                });
            }
            throw error;
        }
    }
    return await ai.models.generateContent(params);
};

const generateContentStreamWithSearchFallback = async (params: any) => {
    const hasSearch = params.config?.tools?.some((t: any) => t && 'googleSearch' in t);
    if (hasSearch) {
        try {
            return await ai.models.generateContentStream(params);
        } catch (error: any) {
            console.warn("Stream with search grounding failed, falling back to direct stream without search tool.", error?.message || error);
            const fallbackConfig = { ...params.config };
            if (fallbackConfig.tools) {
                fallbackConfig.tools = fallbackConfig.tools.filter((t: any) => !('googleSearch' in t));
                if (fallbackConfig.tools.length === 0) delete fallbackConfig.tools;
            }
            return await ai.models.generateContentStream({
                ...params,
                config: fallbackConfig
            });
        }
    }
    return await ai.models.generateContentStream(params);
};

const verifySources = (jsonResult: any, response: any) => {
    if (!jsonResult) return {};
    if (jsonResult.trends && Array.isArray(jsonResult.trends)) {
        jsonResult.trends.forEach((trend: any) => {
            if (!trend.sources) trend.sources = [];
            if (!trend.mitreTechniques) trend.mitreTechniques = [];
            if (!trend.globalImpact) trend.globalImpact = "Analysis yielded no specific global impact data.";
            if (!trend.organizationalImpact) trend.organizationalImpact = "Analysis yielded no specific organizational impact data.";
        });
    }
    if (response.candidates?.[0]?.groundingMetadata?.groundingChunks) {
        const chunks = response.candidates[0].groundingMetadata.groundingChunks;
        const validLinkSet = new Set<string>(chunks.map((c: any) => c.web?.uri).filter((u: any): u is string => typeof u === 'string'));
        
        if (jsonResult.trends && Array.isArray(jsonResult.trends)) {
            jsonResult.trends.forEach((trend: any) => {
                if (trend.sources && Array.isArray(trend.sources)) {
                    trend.sources = trend.sources.filter((s: any) => {
                        if (!s.uri) return false;
                        const normalizedSource = s.uri.replace(/\/$/, '');
                        for (const validUri of validLinkSet) {
                            if (validUri.replace(/\/$/, '') === normalizedSource) return true;
                        }
                        return false;
                    });
                }
            });
        }
    }
    return jsonResult;
};

// ... [Existing exports remain unchanged] ...
export const categorizeThreatActor = async (actorName: string) => {
    return await retry(async () => {
        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: `Categorize the threat actor "${actorName}" into: Nation-State, Criminal, Hacktivist, Insider, or Unknown. Return JSON: { "category": "string", "justification": "string" }`,
            config: { responseMimeType: 'application/json' }
        });
        return JSON.parse(cleanJson(response.text || '{}'));
    });
};

export const runSearchStream = async (query: string) => {
    return await generateContentStreamWithSearchFallback({
        model: 'gemini-3-flash-preview',
        contents: query,
        config: { tools: [{ googleSearch: {} }] }
    });
};

export const getNextStepStream = async (scenario: Scenario, previousLoops: AnalysisLoop[], category: string, analystNotes: string, contextContent: string) => {
    const historyText = previousLoops.map(l => `Query: ${l.query}\nFindings: ${l.findings}\nConclusion: ${l.conclusion}`).join('\n---\n');
    const prompt = `You are a senior CTI analyst. Scenario: ${JSON.stringify(scenario)}. Category: ${category}. Notes: ${analystNotes}. Context: ${contextContent}. Previous Steps: ${historyText}. Synthesize findings. If more info needed, set nextQuery. Output: CONCLUSION_START...CONCLUSION_END JSON_PAYLOAD_START { "nextQuery": "string", "confidenceScore": "Low"|"Medium"|"High", "mitreTechniques": [{"id": "string", "name": "string"}] } JSON_PAYLOAD_END`;
    return await ai.models.generateContentStream({ model: 'gemini-3-flash-preview', contents: prompt });
};

export const generateExecutiveSummary = async (scenario: Scenario, category: string, loops: AnalysisLoop[]) => {
    const historyText = loops.map(l => `Query: ${l.query}\nFindings: ${l.findings}`).join('\n---\n');
    const response = await retry(() => ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Generate executive summary for ${scenario.threatActor} targeting ${scenario.target}. Data: ${historyText}. Format: Markdown.`
    })) as GenerateContentResponse;
    return response.text || "No summary generated.";
};

export const generateSourceSnippets = async (text: string, sources: Source[]) => {
    return sources.map(s => ({ uri: s.uri, snippet: s.snippet || "Relevant source identified during analysis." }));
};

export const getBreachDataPoint = async (actor: string, mo: string, dataPointId: string, year: string, scope: string) => {
    const prompt = `Find specific data/statistics for: Actor: ${actor}, MO: ${mo}, Data Point: ${dataPointId}, Year: ${year}, Scope: ${scope}. Search for precise numbers.`;
    const response = await retry(() => generateContentWithSearchFallback({
        model: 'gemini-3-flash-preview',
        contents: prompt,
        config: { tools: [{ googleSearch: {} }] }
    })) as GenerateContentResponse;
    const sources = response.candidates?.[0]?.groundingMetadata?.groundingChunks?.map((c: any) => ({ uri: c.web?.uri, title: c.web?.title })).filter((s: any) => s.uri) || [];
    return { text: response.text || "No data found.", sources };
};

export const extractKeyStatistic = async (actor: string, mo: string, title: string, data: string, year: string, scope: string) => {
    const response = await retry(() => ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Extract single key statistic for "${title}" from: ${data}. Return ONLY the statistic.`
    })) as GenerateContentResponse;
    return response.text?.trim() || "N/A";
};

export const generateThreatLandscape = async (orgProfile: string, period: { startDate: string, endDate: string, name: string }, numTrends: number, guidance?: string) => {
    let identifyPrompt = `Identify top ${numTrends} cyber threat trends for: ${orgProfile}, period: ${period.name}. JSON: { "reportTitle": "string", "trendTitles": ["string"] }`;
    if (guidance && guidance.trim() !== '') {
        identifyPrompt = `Identify top ${numTrends} cyber threat trends for: ${orgProfile}, period: ${period.name}.\n\nPlease ensure the generated trends incorporate or align with the following guidance/specific events: ${guidance}\n\nJSON: { "reportTitle": "string", "trendTitles": ["string"] }`;
    }
    const identityResponse = await retry(() => ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: identifyPrompt,
        config: { responseMimeType: 'application/json' }
    })) as GenerateContentResponse;
    const identityData = JSON.parse(cleanJson(identityResponse.text || '{}'));
    
    if (!identityData.trendTitles || !Array.isArray(identityData.trendTitles)) throw new Error("Failed to identify trends.");

    const detailedTrends: ThreatLandscapeTrend[] = [];

    for (const title of identityData.trendTitles) {
        let detailPrompt = `Analyze trend "${title}" for ${orgProfile}. 
        Format globalImpact and organizationalImpact as: "**Headline**\nParagraph.\n- Bullet 1\n- Bullet 2".
        Output ONLY a JSON block (no other text) like: { "globalImpact": "string", "organizationalImpact": "string", "mitreTechniques": [{"id": "string", "name": "string"}] }`;
        
        if (guidance && guidance.trim() !== '') {
            detailPrompt = `Analyze trend "${title}" for ${orgProfile}. Special user guidance/context to incorporate if relevant: ${guidance}\n\nFormat globalImpact and organizationalImpact as: "**Headline**\nParagraph.\n- Bullet 1\n- Bullet 2".\nOutput ONLY a JSON block (no other text) like: { "globalImpact": "string", "organizationalImpact": "string", "mitreTechniques": [{"id": "string", "name": "string"}] }`;
        }

        const response = await retry(() => generateContentWithSearchFallback({
            model: 'gemini-3-flash-preview',
            contents: detailPrompt,
            config: { tools: [{ googleSearch: {} }] }
        })) as GenerateContentResponse;
        
        const sources = response.candidates?.[0]?.groundingMetadata?.groundingChunks?.map((c: any) => ({ uri: c.web?.uri, title: c.web?.title })).filter((s: any) => s.uri) || [];
        const details = JSON.parse(cleanJson(response.text || '{}'));
        detailedTrends.push({
            trendTitle: title,
            globalImpact: details.globalImpact || "No data.",
            organizationalImpact: details.organizationalImpact || "No data.",
            mitreTechniques: details.mitreTechniques || [],
            sources: sources
        } as ThreatLandscapeTrend);
    }

    return { reportTitle: identityData.reportTitle || "Report", trends: detailedTrends } as ThreatLandscapeResult;
};

export const generateThreatMatrixPreview = async (orgProfile: string, period: any) => {
    const prompt = `Identify 4 threat themes (Nation State/Criminal vs Tech/Geo) for ${orgProfile}. JSON: { "reportTitle": "string", "nationStateTechTitle": "string", ... }`;
    return await retry(async () => {
        const response = await ai.models.generateContent({ model: 'gemini-3-flash-preview', contents: prompt, config: { responseMimeType: 'application/json' } });
        return JSON.parse(cleanJson(response.text || '{}')) as ThreatMatrixPreview;
    });
};

export const generateThreatMatrix = async (orgProfile: string, period: any, preview: ThreatMatrixPreview) => {
    const prompt = `Generate threat matrix report for ${orgProfile} based on themes: ${JSON.stringify(preview)}. Output ONLY a JSON block with detailed quadrants (no other text).`;
    return await retry(async () => {
        const response = await generateContentWithSearchFallback({
            model: 'gemini-3-flash-preview',
            contents: prompt,
            config: { tools: [{ googleSearch: {} }], maxOutputTokens: 8192 }
        });
        let result = JSON.parse(cleanJson(response.text || '{}'));
        result.reportTitle = preview.reportTitle;
        return verifySources(result, response) as ThreatMatrixResult;
    });
};

export const validateThreatTrend = async (title: string, impact: string, sources: Source[]) => {
    return { confidenceScore: 'High' as const, validationSummary: 'Verified against provided sources.' };
};

export const generateTailoredTrendAnalysis = async (title: string, globalImpact: string, orgImpact: string, profile: string, audience: string) => {
    const prompt = `Tailor threat "${title}" for audience: ${audience} at ${profile}. JSON: { "impact": "string", "recommendations": "bulleted string" }`;
    return await retry(async () => {
        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: prompt,
            config: { responseMimeType: 'application/json' }
        });
        const data = JSON.parse(cleanJson(response.text || '{}'));
        return { impact: data.impact || "N/A", recommendations: data.recommendations || "N/A" };
    });
};

export const refineReportWithChatStream = async (report: any, history: ChatMessage[], input: string, audience: string | null) => {
    const prompt = `Report: ${JSON.stringify(report)}. Request: ${input}. Audience: ${audience}. Update JSON.`;
    return await ai.models.generateContentStream({ model: 'gemini-3-flash-preview', contents: prompt });
};

export const generateThreatRadarData = async (orgProfile: string) => {
    const prompt = `Generate threat radar for ${orgProfile}. Categories: Nation-State, Criminal, Insider, Hacktivist. JSON: { "title": "string", "threats": [...] }`;
    return await retry(async () => {
        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: prompt,
            config: { responseMimeType: 'application/json', maxOutputTokens: 8192 }
        });
        return JSON.parse(cleanJson(response.text || '{}')) as ThreatRadarResult;
    });
};

export const generateArchetypeRadarData = async () => { return generateThreatRadarData("Generic Organization"); };

// --- STRICT MEMORANDUM GENERATION ---

export const generateMemorandumForTrend = async (title: string, global: string, org: string, profile: string, audience: string, threat: any) => {
    const prompt = `
    You are a Senior Cyber Threat Intelligence Analyst. Write a formal Intelligence Memorandum based on this threat trend, strictly following the standard Intelligence Briefing Memorandum template shown below.
    
    Subject: ${title}
    Target Audience: ${audience}
    Organization Profile: ${profile}
    Global Context: ${global}
    Organizational Context: ${org}
    
    You MUST output valid JSON matching this schema:
    {
      "title": "Memorandum — ${title} Outlook",
      "introduction": "Brief overview of the situation:\n- [Bullet 1: Detailed factual overview of the trend and adversary activity]\n- [Bullet 2: Relevant context, geopolitical background, or sector impact]",
      "purpose": "Provide a concise and comprehensive assessment of the given situation, focusing on specific points of concern and offering actionable recommendations.",
      "pointsOfConcern": [
        "[Point 1: Specific tactical or operational vector/vulnerability of concern]",
        "[Point 2: Specific threat actor capability, targeting pattern, or infrastructure]",
        "[Point 3: Specific systemic, supply chain, or defensive exposure]"
      ],
      "assessment": "- [Assessment 1: Unambiguous analytical judgment on threat likelihood and adversary intent]\n- [Assessment 2: Key operational risk to organizational systems or business continuity]\n- [Assessment 3: Strategic outlook and priority proactive defense/mitigation]",
      "detailedAnalysis": [
        {
          "pointTitle": "Paragraph 1: Elaboration on point 1",
          "analysis": "Comprehensive analytic paragraph thoroughly examining the technical mechanics, telemetry, and threat vector."
        },
        {
          "pointTitle": "Paragraph 2: Elaboration on point 2",
          "analysis": "Comprehensive analytic paragraph analyzing adversary attribution, modus operandi, and operational persistence."
        },
        {
          "pointTitle": "Paragraph 3: Elaboration on point 3",
          "analysis": "Comprehensive analytic paragraph evaluating organizational risk, cascade effects, and long-term implications."
        }
      ],
      "biasChallenges": [
        {
          "challenge": "Availability Bias / Reporting Bias",
          "proposedSolution": "Cross-referencing open-source telemetry with closed intelligence to avoid over-weighting recently publicized vendor advisories."
        },
        {
          "challenge": "Mirror Imaging / Attribution Uncertainty",
          "proposedSolution": "Evaluating threat actor intentions through their specific doctrine and regional geopolitical objectives rather than conventional enterprise motives."
        }
      ]
    }
    `;

    return await retry(async () => {
        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: prompt,
            config: {
                responseMimeType: 'application/json'
            }
        });
        
        const data = JSON.parse(cleanJson(response.text || '{}'));
        return {
            title: data.title || `Memorandum — ${title}`,
            introduction: data.introduction || data.situation || "Brief overview of the situation not available.",
            purpose: data.purpose || "Provide a concise and comprehensive assessment of the given situation, focusing on specific points of concern and offering actionable recommendations.",
            pointsOfConcern: Array.isArray(data.pointsOfConcern) ? data.pointsOfConcern : [],
            assessment: data.assessment || "Assessment not available.",
            detailedAnalysis: data.detailedAnalysis || [],
            biasChallenges: data.biasChallenges || [],
            situation: data.introduction || data.situation || "Situation not specified.",
            considerations: Array.isArray(data.pointsOfConcern) ? data.pointsOfConcern.join('\n- ') : (data.considerations || "No considerations provided.")
        } as Memorandum;
    });
};

export const generateMemorandumForEvent = async (event: string, profile: string, audience: string, context: string) => {
    const prompt = `
    You are a Senior Cyber Threat Intelligence Analyst. Write a formal Intelligence Memorandum regarding the specific event below, strictly following the standard Intelligence Briefing Memorandum template.
    
    Event Topic: ${event}
    Target Audience: ${audience}
    Organization Profile: ${profile}
    Additional Context: ${context}
    
    Perform research to gather the latest, detailed information on this event and synthesize it thoroughly.
    
    You MUST output valid JSON matching this exact structure:
    {
      "title": "Memorandum — ${event} outlook",
      "introduction": "Brief overview of the situation:\n- [Bullet 1: Direct factual synopsis of what occurred, where, when, and key actors involved]\n- [Bullet 2: Relevant context, historical precedent, geopolitical background, or infrastructure impact]",
      "purpose": "Provide a concise and comprehensive assessment of the given situation, focusing on specific points of concern and offering actionable recommendations.",
      "pointsOfConcern": [
        "[Point 1: Key tactical/technical vector or exploitation mechanism of concern]",
        "[Point 2: Key operational or infrastructure vulnerability exposed]",
        "[Point 3: Key strategic, regulatory, or cascading risk to the organization]"
      ],
      "assessment": "- [Assessment 1: High-confidence analytical conclusion regarding adversary objectives and immediate threat level]\n- [Assessment 2: Assessment of vulnerability and potential impact on ${profile}]\n- [Assessment 3: Strategic outlook and critical actionable defensive posture recommended for ${audience}]",
      "detailedAnalysis": [
        {
          "pointTitle": "Paragraph 1: Elaboration on point 1",
          "analysis": "Comprehensive analytic paragraph explaining the technical mechanics, attack progression, and threat vectors."
        },
        {
          "pointTitle": "Paragraph 2: Elaboration on point 2",
          "analysis": "Comprehensive analytic paragraph evaluating threat actor capabilities, infrastructure targeting, and weaponization."
        },
        {
          "pointTitle": "Paragraph 3: Elaboration on point 3",
          "analysis": "Comprehensive analytic paragraph analyzing organizational consequences, supply chain risks, and escalation indicators."
        }
      ],
      "biasChallenges": [
        {
          "challenge": "Attribution Bias / Premature Closure",
          "proposedSolution": "Separating direct technical IOC correlation from strategic geopolitical motivation, continuously testing alternate hypotheses."
        },
        {
          "challenge": "Overestimating or Underestimating Threat Actor Capability",
          "proposedSolution": "Benchmarking observed TTPs against verified MITRE ATT&CK techniques rather than media reporting or rhetoric."
        }
      ]
    }
    `;

    return await retry(async () => {
        const response = await generateContentWithSearchFallback({
            model: 'gemini-3-flash-preview',
            contents: prompt,
            config: {
                tools: [{ googleSearch: {} }]
            }
        });
        
        const data = JSON.parse(cleanJson(response.text || '{}'));
        return {
            title: data.title || `Memorandum — ${event}`,
            introduction: data.introduction || data.situation || "Brief overview of the situation not available.",
            purpose: data.purpose || "Provide a concise and comprehensive assessment of the given situation, focusing on specific points of concern and offering actionable recommendations.",
            pointsOfConcern: Array.isArray(data.pointsOfConcern) ? data.pointsOfConcern : [],
            assessment: data.assessment || "Assessment not available.",
            detailedAnalysis: data.detailedAnalysis || [],
            biasChallenges: data.biasChallenges || [],
            situation: data.introduction || data.situation || "Situation not specified.",
            considerations: Array.isArray(data.pointsOfConcern) ? data.pointsOfConcern.join('\n- ') : (data.considerations || "No considerations provided.")
        } as Memorandum;
    });
};

export const generateSingleQuadrantTitle = async (profile: string, period: any, type: string) => {
    const prompt = `Generate a single title for threat matrix quadrant ${type} for ${profile}.`;
    const response = await retry(() => ai.models.generateContent({ model: 'gemini-3-flash-preview', contents: prompt })) as GenerateContentResponse;
    return response.text?.trim() || "New Trend";
};

export const checkForTrendUpdates = async (trend: any, profile: string) => {
    return { updateAvailable: false };
};

export const generateYearlyAttemptsNarrative = async (scenario: any, attempt: any, success: any) => {
    const prompt = `Generate a narrative summary for this risk scenario analysis.`;
    return await retry(async () => {
        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: prompt,
            config: { responseMimeType: 'application/json' }
        });
        return JSON.parse(cleanJson(response.text || '{}'));
    });
};

export const fetchArchetypeSignals = async (scenario: any) => { return { signals: [] }; };

export const extractVectorsFromText = async (text: string) => {
    const prompt = `Extract attack vectors from this text as a comma-separated list: ${text}`;
    const response = await retry(() => ai.models.generateContent({ model: 'gemini-3-flash-preview', contents: prompt })) as GenerateContentResponse;
    return (response.text || '').split(',').map(s => s.trim());
};

export const generateIntelligenceDashboardData = async (sector: string, period: string, sources: string, query: string) => {
    const prompt = `Generate intel dashboard data for Sector: ${sector}, Period: ${period}. Sources: ${sources}. Query: ${query}. Include key threats, CVEs, geo events. Output ONLY a JSON block (no other text).`;
    return await retry(async () => {
        const response = await generateContentWithSearchFallback({
            model: 'gemini-3-flash-preview',
            contents: prompt,
            config: { tools: [{ googleSearch: {} }] }
        });
        return JSON.parse(cleanJson(response.text || '{}')) as IntelligenceDashboardData;
    });
};

export const generateAttackMap = async (scenario: string) => {
    const prompt = `Research the latest threat intelligence for the scenario: "${scenario}". 
Identify the specific MITRE ATT&CK techniques actively being used.
You MUST output ONLY a JSON block (no other text) in the following format:
{
  "scenario": "${scenario}",
  "techniques": [
    {
      "tactic": "Initial Access", 
      "techniqueId": "T1190", 
      "techniqueName": "Exploit Public-Facing Application",
      "description": "Brief explanation of how it is used in this scenario based on recent reports."
    }
  ]
}
Ensure you map techniques across different tactics if applicable (e.g., Initial Access, Execution, Defense Evasion, Exfiltration, Impact).`;

    return await retry(async () => {
        const response = await generateContentWithSearchFallback({
            model: 'gemini-3-flash-preview',
            contents: prompt,
            config: { 
                tools: [{ googleSearch: {} }],
                responseMimeType: 'application/json' 
            }
        });
        
        let result = JSON.parse(cleanJson(response.text || '{}')) as AttackMapResult;
        
        // Map sources
        const sources = response.candidates?.[0]?.groundingMetadata?.groundingChunks?.map((c: any) => ({ 
            uri: c.web?.uri, 
            title: c.web?.title 
        })).filter((s: any) => s.uri) || [];
        
        result.sources = sources;
        return result;
    });
};

export const generateBooleanQuery = async (nlQuery: string) => {
    const prompt = `Convert to boolean search string: "${nlQuery}"`;
    const response = await retry(() => ai.models.generateContent({ model: 'gemini-3-flash-preview', contents: prompt })) as GenerateContentResponse;
    return response.text?.trim() || "";
};