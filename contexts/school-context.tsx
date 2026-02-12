import AsyncStorage from '@react-native-async-storage/async-storage';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import createContextHook from '@nkzw/create-context-hook';
import { useEffect, useState } from 'react';
import type { SchoolConfig } from '@/types/school-config';

const SCHOOL_CONFIG_KEY = '@trafikskola_school_config';
const SCHOOL_DOMAIN_KEY = '@trafikskola_school_domain';

async function fetchSchoolConfig(domain: string): Promise<SchoolConfig> {
  const cleanDomain = domain.trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/$/, '');
  const apiUrl = `https://${cleanDomain}/api/app-config`;

  console.log('[SchoolContext] Fetching config from:', apiUrl);

  const response = await fetch(apiUrl, {
    method: 'GET',
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch school config: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();

  if (!data.success || !data.data) {
    throw new Error(data.error || 'Invalid response from school API');
  }

  // Merge top-level enabledFeatures array into the config
  const config: SchoolConfig = data.data;
  if (data.enabledFeatures && Array.isArray(data.enabledFeatures)) {
    config.enabledFeatures = data.enabledFeatures;
  }

  console.log('[SchoolContext] Config received — logoUrl:', config.branding?.logoUrl || '(none)', 'theme.primary:', config.theme?.primaryColor || '(none)', 'enabledFeatures:', data.enabledFeatures || '(none)');

  return config;
}

export const [SchoolProvider, useSchool] = createContextHook(() => {
  const queryClient = useQueryClient();
  const [isConfigured, setIsConfigured] = useState<boolean | null>(null);
  const [selectedDomain, setSelectedDomain] = useState<string | null>(null);

  const configQuery = useQuery({
    queryKey: ['schoolConfig', selectedDomain],
    queryFn: () => fetchSchoolConfig(selectedDomain!),
    enabled: !!selectedDomain,
    staleTime: 1000 * 60 * 60,
    retry: 2,
  });

  const selectSchoolMutation = useMutation({
    mutationFn: async (domain: string) => {
      const cleanDomain = domain.trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/$/, '');
      console.log('[SchoolContext] Validating domain:', cleanDomain);
      const config = await fetchSchoolConfig(cleanDomain);
      console.log('[SchoolContext] Domain validated, saving:', cleanDomain);
      await AsyncStorage.setItem(SCHOOL_DOMAIN_KEY, cleanDomain);
      await AsyncStorage.setItem(SCHOOL_CONFIG_KEY, JSON.stringify(config));
      return { domain: cleanDomain, config };
    },
    onSuccess: ({ domain, config }) => {
      console.log('[SchoolContext] School saved successfully');
      setSelectedDomain(domain);
      queryClient.setQueryData(['schoolConfig', domain], config);
      setIsConfigured(true);
    },
  });

  const clearSchoolMutation = useMutation({
    mutationFn: async () => {
      console.log('[SchoolContext] Clearing school config');
      await AsyncStorage.multiRemove([SCHOOL_CONFIG_KEY, SCHOOL_DOMAIN_KEY]);
    },
    onSuccess: () => {
      setSelectedDomain(null);
      setIsConfigured(false);
      queryClient.removeQueries({ queryKey: ['schoolConfig'] });
    },
  });

  useEffect(() => {
    if (configQuery.isSuccess && configQuery.data && selectedDomain) {
      console.log('[SchoolContext] Config loaded successfully');
      setIsConfigured(true);
    }
  }, [configQuery.isSuccess, configQuery.data, selectedDomain]);

  useEffect(() => {
    async function loadStoredDomain() {
      try {
        const storedDomain = await AsyncStorage.getItem(SCHOOL_DOMAIN_KEY);
        console.log('[SchoolContext] Loaded stored domain:', storedDomain);

        if (storedDomain) {
          setSelectedDomain(storedDomain);
        } else {
          setIsConfigured(false);
        }
      } catch (error) {
        console.error('[SchoolContext] Error loading domain:', error);
        setIsConfigured(false);
      }
    }

    loadStoredDomain();
  }, []);

  const selectSchool = (domain: string) => {
    selectSchoolMutation.mutate(domain);
  };

  const clearSchool = () => {
    clearSchoolMutation.mutate();
  };

  return {
    config: configQuery.data ?? null,
    selectedDomain,
    isLoading: configQuery.isLoading || isConfigured === null,
    isConfigured: isConfigured === true,
    error: selectSchoolMutation.error,
    selectSchool,
    clearSchool,
    refetch: configQuery.refetch,
    isSaving: selectSchoolMutation.isPending,
  };
});
