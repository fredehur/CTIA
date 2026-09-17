import React from 'react';
import type { Scenario } from '../types';

interface ScenarioInputProps {
  scenario: Scenario;
  setScenario: (scenario: Scenario) => void;
  onGeneratePlan: () => void;
  isLoading: boolean;
  loadingText?: string;
}

const industryOptions = [
    { value: '', label: 'Select Industry...' },
    { value: 'Financial Services', label: 'Financial Services' },
    { value: 'Healthcare', label: 'Healthcare' },
    { value: 'Government', label: 'Government' },
    { value: 'Energy', label: 'Energy' },
    { value: 'Technology', label: 'Technology' },
    { value: 'Telecommunications', label: 'Telecommunications' },
    { value: 'Manufacturing', label: 'Manufacturing' },
    { value: 'Retail', label: 'Retail' },
    { value: 'Other', label: 'Other' },
];

const purdueLevelOptions = [
    { value: 'N/A', label: 'N/A (Not an ICS Target)' },
    { value: 'Level 0', label: 'Level 0: Physical Process' },
    { value: 'Level 1', label: 'Level 1: Basic Control' },
    { value: 'Level 2', label: 'Level 2: Area Supervisory Control' },
    { value: 'Level 3', label: 'Level 3: Site Control' },
    { value: 'Level 4', label: 'Level 4: Site Business Planning' },
    { value: 'Level 5', label: 'Level 5: Enterprise Network' },
];

export const ScenarioInput: React.FC<ScenarioInputProps> = ({ scenario, setScenario, onGeneratePlan, isLoading, loadingText = 'Analyzing...' }) => {
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setScenario({ ...scenario, [name]: value });
  };

  const isAnalyzeDisabled = !scenario.threatActor || !scenario.modusOperandi || !scenario.target || isLoading;

  return (
    <div className="bg-card p-4 rounded-lg border border-border">
      <h2 className="text-xl font-semibold text-text-primary mb-4">Define Threat Scenario</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-x-6 gap-y-4">
        {/* Core Inputs */}
        <InputField
          label="Threat Actor"
          name="threatActor"
          value={scenario.threatActor}
          onChange={handleInputChange}
          placeholder="e.g., Lazarus Group"
        />
        <InputField
          label="Modus Operandi"
          name="modusOperandi"
          value={scenario.modusOperandi}
          onChange={handleInputChange}
          placeholder="e.g., Spear-phishing with malicious documents"
        />
        <InputField
          label="Target"
          name="target"
          value={scenario.target}
          onChange={handleInputChange}
          placeholder="e.g., Financial Institutions"
        />
        
        {/* Contextual Inputs */}
        <SelectField
          label="Target Industry (Optional)"
          name="targetIndustry"
          value={scenario.targetIndustry || ''}
          onChange={handleInputChange}
          options={industryOptions}
        />
        <InputField
          label="Geographic Region (Optional)"
          name="geographicRegion"
          value={scenario.geographicRegion || ''}
          onChange={handleInputChange}
          placeholder="e.g., Eastern Europe"
        />
        <SelectField
          label="Purdue Level (Optional)"
          name="purdueLevel"
          value={scenario.purdueLevel || 'N/A'}
          onChange={handleInputChange}
          options={purdueLevelOptions}
        />
         {/* Button Container */}
        <div className="md:col-span-3 mt-4">
          { isLoading ? (
              <div className="w-full flex items-center justify-center gap-2 px-6 py-2.5 text-base font-semibold rounded-lg border-2 border-accent-pro text-text-primary">
                 <svg className="animate-spin h-5 w-5 mr-3 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span>{loadingText}</span>
              </div>
          ) : (
            <button
              onClick={onGeneratePlan}
              disabled={isAnalyzeDisabled}
              className={`
                w-full flex items-center justify-center gap-2 px-6 py-2.5 text-base font-semibold rounded-lg transition-all duration-200 
                focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-card focus:ring-accent-primary
                bg-accent-pro hover:opacity-90 text-white disabled:bg-surface disabled:text-text-secondary disabled:cursor-not-allowed
              `}
            >
              Generate Query Plan
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

interface InputFieldProps {
    label: string;
    name: string;
    value: string;
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    placeholder: string;
}

const InputField: React.FC<InputFieldProps> = ({ label, name, value, onChange, placeholder }) => (
    <div>
        <label htmlFor={name} className="block text-sm font-semibold text-text-secondary mb-1">{label}</label>
        <input
            type="text"
            id={name}
            name={name}
            value={value}
            onChange={onChange}
            placeholder={placeholder}
            className="w-full bg-surface border h-9 border-border rounded-md px-3 text-text-primary placeholder-text-secondary focus:outline-none focus:border-text-secondary transition-colors"
        />
    </div>
);

interface SelectFieldProps {
    label: string;
    name: string;
    value: string;
    onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
    options: { value: string; label: string }[];
}

const SelectField: React.FC<SelectFieldProps> = ({ label, name, value, onChange, options }) => (
    <div>
        <label htmlFor={name} className="block text-sm font-semibold text-text-secondary mb-1">{label}</label>
        <select
            id={name}
            name={name}
            value={value}
            onChange={onChange}
            className="w-full bg-surface border h-9 border-border rounded-md px-3 text-text-primary placeholder-text-secondary focus:outline-none focus:border-text-secondary transition-colors"
        >
            {options.map(option => (
                <option key={option.value} value={option.value}>
                    {option.label}
                </option>
            ))}
        </select>
    </div>
);