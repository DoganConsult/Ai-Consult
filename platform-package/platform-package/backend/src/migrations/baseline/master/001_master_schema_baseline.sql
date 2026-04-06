-- ============================================
-- Master Schema Baseline
-- Generated: 2026-03-17T00:24:50.187Z
-- Baseline version: 257
-- DO NOT EDIT MANUALLY — regenerate via generate-baseline.ts
-- ============================================

--

--

\restrict t5AI49aYLCXCPLxBDHj8C7ebkf1Mhgn0vPnrvw97Tf6vZZ2bcqlnte7FK2WOueo

--
-- Name: public; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA public;


--
-- Name: audit_config_changes(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.audit_config_changes() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    IF TG_OP = 'DELETE' THEN
        INSERT INTO onboarding_config_audit(table_name, record_id, action, old_values)
        VALUES (TG_TABLE_NAME, OLD.id, TG_OP, row_to_json(OLD));
        RETURN OLD;
    ELSIF TG_OP = 'UPDATE' THEN
        INSERT INTO onboarding_config_audit(table_name, record_id, action, old_values, new_values)
        VALUES (TG_TABLE_NAME, NEW.id, TG_OP, row_to_json(OLD), row_to_json(NEW));
        RETURN NEW;
    ELSIF TG_OP = 'INSERT' THEN
        INSERT INTO onboarding_config_audit(table_name, record_id, action, new_values)
        VALUES (TG_TABLE_NAME, NEW.id, TG_OP, row_to_json(NEW));
        RETURN NEW;
    END IF;
    RETURN NULL;
END;
$$;


--
-- Name: emit_onboarding_event(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.emit_onboarding_event() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
      BEGIN
        -- Notify about session status changes
        IF TG_OP = 'UPDATE' AND OLD.status != NEW.status THEN
          PERFORM pg_notify('onboarding_events', json_build_object(
            'event', 'session_status_changed',
            'session_id', NEW.id,
            'old_status', OLD.status,
            'new_status', NEW.status,
            'tenant_id', NEW.tenant_id
          )::text);
        END IF;

        -- Notify about session completion
        IF TG_OP = 'UPDATE' AND NEW.status = 'completed' AND OLD.status != 'completed' THEN
          PERFORM pg_notify('onboarding_events', json_build_object(
            'event', 'session_completed',
            'session_id', NEW.id,
            'tenant_id', NEW.tenant_id,
            'workspace_id', NEW.workspace_id,
            'readiness_score', NEW.readiness_score
          )::text);
        END IF;

        RETURN NEW;
      END;
      $$;


--
-- Name: emit_provisioning_event(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.emit_provisioning_event() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
      BEGIN
        -- Notify about job status changes
        IF TG_OP = 'UPDATE' AND OLD.job_status != NEW.job_status THEN
          PERFORM pg_notify('provisioning_events', json_build_object(
            'event', 'job_status_changed',
            'job_id', NEW.id,
            'session_id', NEW.session_id,
            'old_status', OLD.job_status,
            'new_status', NEW.job_status,
            'tenant_id', NEW.tenant_id
          )::text);
        END IF;

        -- Notify about provisioning completion
        IF TG_OP = 'UPDATE' AND NEW.job_status = 'completed' AND OLD.job_status != 'completed' THEN
          PERFORM pg_notify('provisioning_events', json_build_object(
            'event', 'provisioning_completed',
            'job_id', NEW.id,
            'session_id', NEW.session_id,
            'tenant_id', NEW.tenant_id,
            'workspace_id', NEW.workspace_id
          )::text);
        END IF;

        RETURN NEW;
      END;
      $$;


--
-- Name: find_uncategorized_tables(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.find_uncategorized_tables() RETURNS TABLE(schema_name character varying, table_name character varying)
    LANGUAGE plpgsql
    AS $$
BEGIN
    RETURN QUERY
    SELECT
        ist.table_schema::VARCHAR as schema_name,
        ist.table_name::VARCHAR
    FROM information_schema.tables ist
    WHERE ist.table_schema = 'public'
    AND ist.table_type = 'BASE TABLE'
    AND NOT EXISTS (
        SELECT 1 FROM table_system_flags tsf
        WHERE tsf.schema_name = ist.table_schema
        AND tsf.table_name = ist.table_name
    )
    ORDER BY ist.table_name;
END;
$$;


--
-- Name: fn_sync_sector_frameworks(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_sync_sector_frameworks() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
  target_sector_id VARCHAR(50);
BEGIN
  IF TG_OP = 'DELETE' THEN
    target_sector_id := OLD.sector_id;
  ELSE
    target_sector_id := NEW.sector_id;
  END IF;

  UPDATE public.sectors
  SET applicable_frameworks = (
    SELECT COALESCE(array_agg(
      COALESCE(a.alias_code, sf.framework_code)
      ORDER BY sf.framework_code
    ), '{}')
    FROM public.sector_framework sf
    LEFT JOIN public.framework_alias a ON a.framework_code = sf.framework_code
    WHERE sf.sector_id = target_sector_id
      AND (sf.effective_to IS NULL OR sf.effective_to > CURRENT_DATE)
  ),
  updated_at = NOW()
  WHERE sector_id = target_sector_id;

  RETURN COALESCE(NEW, OLD);
END;
$$;


--
-- Name: fn_sync_sector_regulators(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_sync_sector_regulators() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
  target_sector_id VARCHAR(50);
BEGIN
  IF TG_OP = 'DELETE' THEN
    target_sector_id := OLD.sector_id;
  ELSE
    target_sector_id := NEW.sector_id;
  END IF;

  UPDATE public.sectors
  SET applicable_regulators = (
    SELECT COALESCE(array_agg(sr.regulator_id ORDER BY sr.regulator_id), '{}')
    FROM public.sector_regulator sr
    WHERE sr.sector_id = target_sector_id
      AND (sr.effective_to IS NULL OR sr.effective_to > CURRENT_DATE)
  ),
  updated_at = NOW()
  WHERE sector_id = target_sector_id;

  RETURN COALESCE(NEW, OLD);
END;
$$;


--
-- Name: get_sector_risk_control_chain(character varying); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_sector_risk_control_chain(p_sector_code character varying) RETURNS TABLE(risk_category text, risk_title text, control_count bigint, frameworks text, regulators text, avg_mitigation integer, compliance_status text)
    LANGUAGE plpgsql
    AS $$
BEGIN
    RETURN QUERY
    WITH sector_chain AS (
        SELECT
            rc.risk_code,
            r.risk_title_en,
            COUNT(DISTINCT rcf.control_code) as control_count,
            STRING_AGG(DISTINCT rcf.framework_code, ', ') as frameworks,
            STRING_AGG(DISTINCT rcf.regulator_code, ', ') as regulators,
            AVG(rcf.mitigation_percentage)::INTEGER as avg_mitigation
        FROM risk_control_framework_chain rcf
        JOIN risks r ON r.risk_code = rcf.risk_code
        JOIN risk_categories rc ON rc.id = r.risk_category_id
        WHERE rcf.sector_code = p_sector_code
        GROUP BY rc.risk_code, r.risk_title_en
    )
    SELECT
        sc.risk_code::TEXT,
        sc.risk_title_en::TEXT,
        sc.control_count,
        sc.frameworks::TEXT,
        sc.regulators::TEXT,
        sc.avg_mitigation,
        CASE
            WHEN sc.avg_mitigation >= 80 THEN 'Well Controlled'
            WHEN sc.avg_mitigation >= 60 THEN 'Adequately Controlled'
            WHEN sc.avg_mitigation >= 40 THEN 'Partially Controlled'
            ELSE 'Needs Improvement'
        END::TEXT as compliance_status
    FROM sector_chain sc
    ORDER BY sc.avg_mitigation DESC;
END;
$$;


--
-- Name: get_tables_by_system(character varying); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_tables_by_system(p_category character varying) RETURNS TABLE(table_name character varying, module_name character varying, description text, is_multi_tenant boolean)
    LANGUAGE plpgsql
    AS $$
BEGIN
    RETURN QUERY
    SELECT
        tsf.table_name,
        tsf.module_name,
        tsf.description,
        tsf.is_multi_tenant
    FROM table_system_flags tsf
    WHERE tsf.system_category = p_category
    AND tsf.is_active = TRUE
    ORDER BY tsf.module_name, tsf.table_name;
END;
$$;


--
-- Name: merkle_witness_immutable(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.merkle_witness_immutable() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
    BEGIN
      RAISE EXCEPTION 'audit_merkle_witnesses is immutable: % operations are forbidden', TG_OP;
      RETURN NULL;
    END;
    $$;


--
-- Name: refresh_materialized_views(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.refresh_materialized_views() RETURNS void
    LANGUAGE plpgsql
    AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY public.mv_regulatory_catalog_summary;
  REFRESH MATERIALIZED VIEW CONCURRENTLY public.mv_framework_control_distribution;
  REFRESH MATERIALIZED VIEW CONCURRENTLY public.mv_authority_coverage;
  REFRESH MATERIALIZED VIEW CONCURRENTLY public.mv_cross_mapping_matrix;
  REFRESH MATERIALIZED VIEW CONCURRENTLY public.mv_sector_regulatory_burden;
END;
$$;


--
-- Name: search_cities(text, character varying, integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.search_cities(search_term text, country_filter character varying DEFAULT NULL::character varying, limit_results integer DEFAULT 10) RETURNS TABLE(id uuid, city_code character varying, city_name_en character varying, city_name_ar character varying, country_code character varying, is_major_city boolean, relevance_score real)
    LANGUAGE plpgsql
    AS $$
BEGIN
  RETURN QUERY
  SELECT
    c.id,
    c.city_code,
    c.city_name_en,
    c.city_name_ar,
    c.country_code,
    c.is_major_city,
    CASE
      WHEN c.city_name_en ILIKE search_term || '%' THEN 100
      WHEN c.is_major_city THEN 50
      ELSE ts_rank(
        to_tsvector('english', c.city_name_en),
        plainto_tsquery('english', search_term)
      ) * 10
    END AS relevance_score
  FROM lookup_cities c
  WHERE c.is_active = true
    AND (country_filter IS NULL OR c.country_code = country_filter)
    AND (
      to_tsvector('english', c.city_name_en) @@ plainto_tsquery('english', search_term)
      OR c.city_name_en ILIKE '%' || search_term || '%'
      OR c.city_name_ar ILIKE '%' || search_term || '%'
    )
  ORDER BY relevance_score DESC, c.is_capital DESC, c.is_major_city DESC, c.sort_order ASC
  LIMIT limit_results;
END;
$$;


--
-- Name: search_sectors(text, integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.search_sectors(search_term text, result_limit integer DEFAULT 50) RETURNS TABLE(id uuid, sector_code character varying, sector_name_en text, sector_name_ar text, parent_sector_code character varying, level integer, icon_class character varying, relevance_score real)
    LANGUAGE plpgsql STABLE
    AS $$
BEGIN
  RETURN QUERY
  SELECT
    s.id,
    s.sector_code,
    s.sector_name_en,
    s.sector_name_ar,
    s.parent_sector_code,
    s.level,
    s.icon_class,
    ts_rank(
      to_tsvector('english', s.sector_name_en || ' ' || COALESCE(s.description_en, '')),
      plainto_tsquery('english', search_term)
    ) AS relevance_score
  FROM lookup_sectors s
  WHERE s.is_active = true
    AND (
      to_tsvector('english', s.sector_name_en || ' ' || COALESCE(s.description_en, '')) @@ plainto_tsquery('english', search_term)
      OR s.sector_name_en ILIKE '%' || search_term || '%'
      OR s.sector_name_ar ILIKE '%' || search_term || '%'
    )
  ORDER BY relevance_score DESC, s.sort_order
  LIMIT result_limit;
END;
$$;


--
-- Name: track_answer_changes(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.track_answer_changes() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO onboarding_answer_history(
      answer_id, session_id, user_id, tenant_id,
      question_id, question_code,
      answer_value, answer_json, answer_type,
      action, created_by
    ) VALUES (
      NEW.id, NEW.session_id, NEW.user_id, NEW.tenant_id,
      NEW.question_id, NEW.question_code,
      NEW.answer_value, NEW.answer_json, NEW.answer_type,
      'CREATE', NEW.created_by
    );
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.answer_value IS DISTINCT FROM NEW.answer_value OR
       OLD.answer_json IS DISTINCT FROM NEW.answer_json THEN
      INSERT INTO onboarding_answer_history(
        answer_id, session_id, user_id, tenant_id,
        question_id, question_code,
        answer_value, answer_json, answer_type,
        action, previous_value, previous_json, created_by
      ) VALUES (
        NEW.id, NEW.session_id, NEW.user_id, NEW.tenant_id,
        NEW.question_id, NEW.question_code,
        NEW.answer_value, NEW.answer_json, NEW.answer_type,
        'UPDATE', OLD.answer_value, OLD.answer_json, NEW.updated_by
      );
    END IF;
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO onboarding_answer_history(
      answer_id, session_id, user_id, tenant_id,
      question_id, question_code,
      answer_value, answer_json, answer_type,
      action, created_by
    ) VALUES (
      OLD.id, OLD.session_id, OLD.user_id, OLD.tenant_id,
      OLD.question_id, OLD.question_code,
      OLD.answer_value, OLD.answer_json, OLD.answer_type,
      'DELETE', OLD.updated_by
    );
  END IF;
  RETURN NEW;
END;
$$;


--
-- Name: update_control_search_vector(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_control_search_vector() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  NEW.search_vector := to_tsvector('english',
    COALESCE(NEW.control_title_en, '') || ' ' ||
    COALESCE(NEW.control_description_en, '') || ' ' ||
    COALESCE(NEW.control_code, '') || ' ' ||
    COALESCE(NEW.control_number, '')
  );
  RETURN NEW;
END;
$$;


--
-- Name: update_session_progress(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_session_progress() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
  v_total_questions INTEGER;
  v_answered_questions INTEGER;
  v_required_questions INTEGER;
  v_required_answered INTEGER;
  v_completion_percentage NUMERIC(5,2);
BEGIN
  -- Calculate progress metrics
  SELECT
    COUNT(*) FILTER (WHERE q.is_active = true),
    COUNT(*) FILTER (WHERE a.id IS NOT NULL),
    COUNT(*) FILTER (WHERE q.is_required = true AND q.is_active = true),
    COUNT(*) FILTER (WHERE q.is_required = true AND a.id IS NOT NULL)
  INTO
    v_total_questions,
    v_answered_questions,
    v_required_questions,
    v_required_answered
  FROM onboarding_questions q
  LEFT JOIN onboarding_user_answers a
    ON q.id = a.question_id
    AND a.session_id = NEW.session_id;

  -- Calculate completion percentage
  IF v_required_questions > 0 THEN
    v_completion_percentage := (v_required_answered::NUMERIC / v_required_questions::NUMERIC) * 100;
  ELSE
    v_completion_percentage := 0;
  END IF;

  -- Update session
  UPDATE onboarding_sessions
  SET
    total_questions = v_total_questions,
    answered_questions = v_answered_questions,
    required_questions = v_required_questions,
    required_answered = v_required_answered,
    completion_percentage = v_completion_percentage,
    last_activity_at = NOW()
  WHERE id = NEW.session_id;

  RETURN NEW;
END;
$$;


--
-- Name: update_updated_at_column(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_updated_at_column() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

--
-- Name: _backup_lookup_sectors_old; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public._backup_lookup_sectors_old (
    id uuid,
    sector_code character varying(50),
    sector_name_en text,
    sector_name_ar text,
    parent_sector_code character varying(50),
    icon_class character varying(100),
    level integer,
    typical_frameworks text[],
    is_active boolean,
    sort_order integer,
    created_at timestamp with time zone,
    description_en text,
    description_ar text,
    regulatory_requirements text[]
);


--
-- Name: _retired_lookup_cities; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public._retired_lookup_cities (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    city_code character varying(50) NOT NULL,
    city_name_en character varying(255) NOT NULL,
    city_name_ar character varying(255) NOT NULL,
    country_code character varying(2) NOT NULL,
    state_province character varying(255),
    region character varying(255),
    latitude numeric(10,8),
    longitude numeric(11,8),
    population integer,
    is_capital boolean DEFAULT false,
    is_major_city boolean DEFAULT false,
    timezone character varying(100),
    is_active boolean DEFAULT true,
    sort_order integer,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: _retired_lookup_countries; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public._retired_lookup_countries (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    country_code character varying(2) NOT NULL,
    country_code_3 character varying(3) NOT NULL,
    name_en character varying(255) NOT NULL,
    name_ar character varying(255) NOT NULL,
    dial_code character varying(10),
    flag_emoji character varying(10),
    continent character varying(50),
    currency_code character varying(3),
    is_active boolean DEFAULT true,
    sort_order integer,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: _retired_lookup_employee_ranges; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public._retired_lookup_employee_ranges (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    range_code character varying(50) NOT NULL,
    range_label_en character varying(100) NOT NULL,
    range_label_ar character varying(100) NOT NULL,
    min_employees integer,
    max_employees integer,
    enterprise_type character varying(50),
    is_active boolean DEFAULT true,
    sort_order integer,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: _retired_lookup_frameworks; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public._retired_lookup_frameworks (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    framework_code character varying(50) NOT NULL,
    framework_name character varying(255) NOT NULL,
    framework_acronym character varying(50),
    description_en text,
    description_ar text,
    regulatory_body character varying(255),
    jurisdiction character varying(100),
    applicable_sectors jsonb DEFAULT '[]'::jsonb,
    compliance_level character varying(50),
    version character varying(50),
    effective_date date,
    is_active boolean DEFAULT true,
    sort_order integer,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: _retired_lookup_languages; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public._retired_lookup_languages (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    language_code character varying(10) NOT NULL,
    language_name_en character varying(255) NOT NULL,
    language_name_native character varying(255) NOT NULL,
    language_family character varying(100),
    script character varying(50),
    rtl boolean DEFAULT false,
    is_primary boolean DEFAULT false,
    is_active boolean DEFAULT true,
    sort_order integer,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: _retired_lookup_sectors; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public._retired_lookup_sectors (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    sector_code character varying(50) NOT NULL,
    parent_sector_code character varying(50),
    sector_name_en character varying(255) NOT NULL,
    sector_name_ar character varying(255) NOT NULL,
    description_en text,
    description_ar text,
    icon_class character varying(100),
    color_code character varying(7),
    level integer DEFAULT 1,
    naics_code character varying(10),
    isic_code character varying(10),
    regulatory_requirements jsonb DEFAULT '[]'::jsonb,
    typical_frameworks jsonb DEFAULT '[]'::jsonb,
    is_active boolean DEFAULT true,
    sort_order integer,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: _retired_lookup_timezones; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public._retired_lookup_timezones (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    timezone_code character varying(100) NOT NULL,
    timezone_name character varying(255) NOT NULL,
    utc_offset character varying(10) NOT NULL,
    utc_offset_minutes integer NOT NULL,
    dst_offset character varying(10),
    countries text[],
    is_active boolean DEFAULT true,
    sort_order integer,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: _retired_onboarding_compliance_mapping; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public._retired_onboarding_compliance_mapping (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    question_id uuid NOT NULL,
    framework_code character varying(50) NOT NULL,
    requirement_id character varying(100),
    requirement_text text,
    criticality character varying(20),
    evidence_required boolean DEFAULT false,
    notes text,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT onboarding_compliance_mapping_criticality_check CHECK (((criticality)::text = ANY ((ARRAY['critical'::character varying, 'high'::character varying, 'medium'::character varying, 'low'::character varying])::text[])))
);


--
-- Name: _retired_onboarding_config_audit; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public._retired_onboarding_config_audit (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    table_name character varying(100) NOT NULL,
    record_id uuid NOT NULL,
    action character varying(20) NOT NULL,
    old_values jsonb,
    new_values jsonb,
    changed_by uuid,
    changed_at timestamp with time zone DEFAULT now(),
    ip_address inet,
    user_agent text,
    CONSTRAINT onboarding_config_audit_action_check CHECK (((action)::text = ANY ((ARRAY['INSERT'::character varying, 'UPDATE'::character varying, 'DELETE'::character varying])::text[])))
);


--
-- Name: _retired_onboarding_dynamic_lookups; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public._retired_onboarding_dynamic_lookups (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    lookup_code character varying(100) NOT NULL,
    lookup_name_en character varying(255) NOT NULL,
    lookup_name_ar character varying(255) NOT NULL,
    category character varying(100),
    parent_lookup_code character varying(100),
    value_code character varying(100) NOT NULL,
    value_text_en text NOT NULL,
    value_text_ar text NOT NULL,
    description_en text,
    description_ar text,
    metadata jsonb DEFAULT '{}'::jsonb,
    tags jsonb DEFAULT '[]'::jsonb,
    is_active boolean DEFAULT true,
    sort_order integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: _retired_onboarding_field_guidance; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public._retired_onboarding_field_guidance (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    question_id uuid,
    field_name character varying(100),
    guidance_type character varying(50),
    title_en character varying(255),
    title_ar character varying(255),
    content_en text NOT NULL,
    content_ar text NOT NULL,
    example_values jsonb DEFAULT '[]'::jsonb,
    show_icon boolean DEFAULT true,
    icon_class character varying(100),
    color_class character varying(100),
    "position" character varying(20) DEFAULT 'tooltip'::character varying,
    trigger_event character varying(20) DEFAULT 'hover'::character varying,
    show_condition jsonb DEFAULT '{}'::jsonb,
    is_active boolean DEFAULT true,
    sort_order integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT onboarding_field_guidance_guidance_type_check CHECK (((guidance_type)::text = ANY ((ARRAY['help'::character varying, 'example'::character varying, 'warning'::character varying, 'best_practice'::character varying, 'compliance'::character varying])::text[])))
);


--
-- Name: _retired_onboarding_question_options; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public._retired_onboarding_question_options (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    question_id uuid NOT NULL,
    option_code character varying(100) NOT NULL,
    option_value text NOT NULL,
    option_label_en text NOT NULL,
    option_label_ar text NOT NULL,
    description_en text,
    description_ar text,
    icon_class character varying(100),
    color_code character varying(7),
    triggers_questions jsonb DEFAULT '[]'::jsonb,
    impacts jsonb DEFAULT '{}'::jsonb,
    metadata jsonb DEFAULT '{}'::jsonb,
    is_default boolean DEFAULT false,
    sort_order integer NOT NULL,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: _retired_onboarding_question_types; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public._retired_onboarding_question_types (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    type_code character varying(50) NOT NULL,
    type_name character varying(100) NOT NULL,
    description text,
    validation_rules jsonb DEFAULT '{}'::jsonb,
    ui_component character varying(100),
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: _retired_onboarding_questions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public._retired_onboarding_questions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    question_code character varying(100) NOT NULL,
    stage_code character varying(100) NOT NULL,
    question_type_id uuid NOT NULL,
    question_text_en text NOT NULL,
    question_text_ar text NOT NULL,
    help_text_en text,
    help_text_ar text,
    placeholder_en character varying(255),
    placeholder_ar character varying(255),
    tooltip_en text,
    tooltip_ar text,
    is_required boolean DEFAULT true,
    is_conditional boolean DEFAULT false,
    condition_rules jsonb DEFAULT '{}'::jsonb,
    validation_rules jsonb DEFAULT '{}'::jsonb,
    default_value text,
    lookup_table character varying(100),
    lookup_filter jsonb DEFAULT '{}'::jsonb,
    allow_custom_value boolean DEFAULT false,
    display_order integer NOT NULL,
    display_group character varying(100),
    display_width character varying(20) DEFAULT 'full'::character varying,
    icon_class character varying(100),
    impacts_provisioning boolean DEFAULT false,
    impacts_compliance boolean DEFAULT false,
    compliance_frameworks jsonb DEFAULT '[]'::jsonb,
    tags jsonb DEFAULT '[]'::jsonb,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    created_by uuid,
    updated_by uuid
);


--
-- Name: _retired_onboarding_stage_definitions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public._retired_onboarding_stage_definitions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    stage_code character varying(100) NOT NULL,
    sort_order integer NOT NULL,
    icon_class character varying(100),
    label_en character varying(255) NOT NULL,
    label_ar character varying(255) NOT NULL,
    description_en text,
    description_ar text,
    is_required boolean DEFAULT true,
    is_active boolean DEFAULT true,
    min_readiness_score numeric(5,2) DEFAULT 0,
    max_completion_days integer DEFAULT 30,
    validation_rules jsonb DEFAULT '{}'::jsonb,
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    created_by uuid,
    updated_by uuid
);


--
-- Name: _retired_onboarding_tenant_overrides; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public._retired_onboarding_tenant_overrides (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    override_type character varying(50) NOT NULL,
    override_key character varying(255) NOT NULL,
    override_value jsonb NOT NULL,
    is_active boolean DEFAULT true,
    valid_from date,
    valid_until date,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    created_by uuid,
    updated_by uuid,
    CONSTRAINT onboarding_tenant_overrides_override_type_check CHECK (((override_type)::text = ANY ((ARRAY['stage'::character varying, 'step'::character varying, 'config'::character varying, 'translation'::character varying])::text[])))
);


--
-- Name: _retired_onboarding_translations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public._retired_onboarding_translations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    translation_key character varying(255) NOT NULL,
    text_en text NOT NULL,
    text_ar text NOT NULL,
    text_fr text,
    text_es text,
    text_de text,
    text_zh text,
    text_ja text,
    text_ru text,
    context character varying(100),
    module character varying(100) DEFAULT 'onboarding'::character varying,
    is_active boolean DEFAULT true,
    is_html boolean DEFAULT false,
    variables character varying(100)[],
    max_length integer,
    notes text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    created_by uuid,
    updated_by uuid,
    CONSTRAINT onboarding_translations_context_check CHECK (((context)::text = ANY ((ARRAY['ui'::character varying, 'message'::character varying, 'error'::character varying, 'tooltip'::character varying, 'placeholder'::character varying, 'validation'::character varying, 'help'::character varying])::text[])))
);


--
-- Name: _retired_onboarding_ui_config; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public._retired_onboarding_ui_config (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    config_key character varying(100) NOT NULL,
    config_value text NOT NULL,
    value_type character varying(50) NOT NULL,
    category character varying(100),
    description text,
    is_active boolean DEFAULT true,
    is_editable boolean DEFAULT true,
    min_value numeric,
    max_value numeric,
    allowed_values text[],
    default_value text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    created_by uuid,
    updated_by uuid,
    CONSTRAINT onboarding_ui_config_value_type_check CHECK (((value_type)::text = ANY ((ARRAY['number'::character varying, 'boolean'::character varying, 'string'::character varying, 'json'::character varying, 'array'::character varying])::text[])))
);


--
-- Name: _retired_onboarding_user_answers; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public._retired_onboarding_user_answers (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    session_id uuid NOT NULL,
    user_id uuid NOT NULL,
    tenant_id uuid,
    question_id uuid NOT NULL,
    question_code character varying(100) NOT NULL,
    answer_value text,
    answer_json jsonb,
    answer_type character varying(50),
    is_valid boolean DEFAULT true,
    validation_errors jsonb DEFAULT '[]'::jsonb,
    validation_timestamp timestamp with time zone,
    time_spent_seconds integer,
    change_count integer DEFAULT 0,
    source character varying(50) DEFAULT 'manual'::character varying,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    created_by uuid,
    updated_by uuid
);


--
-- Name: _retired_provisioning_step_definitions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public._retired_provisioning_step_definitions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    step_code character varying(100) NOT NULL,
    step_name character varying(255) NOT NULL,
    step_name_ar character varying(255),
    sequence_no integer NOT NULL,
    is_required boolean DEFAULT true,
    is_active boolean DEFAULT true,
    can_retry boolean DEFAULT true,
    max_retries integer DEFAULT 3,
    timeout_seconds integer DEFAULT 300,
    handler_class character varying(255),
    depends_on character varying(100)[],
    configuration jsonb DEFAULT '{}'::jsonb,
    error_handling jsonb DEFAULT '{"action": "fail", "notification": true}'::jsonb,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    created_by uuid,
    updated_by uuid
);


--
-- Name: activated_templates; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.activated_templates (
    activation_id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id character varying(64) NOT NULL,
    template_key character varying(64) NOT NULL,
    phase_type character varying(32) NOT NULL,
    customized_definition jsonb NOT NULL,
    ai_generated_content jsonb DEFAULT '[]'::jsonb NOT NULL,
    activated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: activity_feed; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.activity_feed (
    activity_id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    user_name character varying(255),
    action character varying(50) NOT NULL,
    module character varying(100) NOT NULL,
    entity_type character varying(50) NOT NULL,
    entity_id uuid NOT NULL,
    entity_title character varying(500),
    metadata jsonb DEFAULT '{}'::jsonb,
    read boolean DEFAULT false,
    archived boolean DEFAULT false,
    snoozed_until timestamp with time zone,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: activity_notifications; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.activity_notifications (
    notification_id uuid DEFAULT gen_random_uuid() NOT NULL,
    activity_id uuid NOT NULL,
    user_id character varying(100) NOT NULL,
    read boolean DEFAULT false,
    dismissed boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now(),
    read_at timestamp with time zone
);


--
-- Name: agent_collaboration_metrics; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.agent_collaboration_metrics (
    metric_id uuid DEFAULT gen_random_uuid() NOT NULL,
    agent_user_id character varying(64) NOT NULL,
    suggestions_generated integer DEFAULT 0,
    suggestions_accepted integer DEFAULT 0,
    tasks_completed integer DEFAULT 0,
    avg_task_duration_ms integer DEFAULT 0,
    error_count integer DEFAULT 0,
    snapshot_at timestamp with time zone DEFAULT now()
);


--
-- Name: agent_performance; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.agent_performance (
    record_id uuid DEFAULT gen_random_uuid() NOT NULL,
    agent_id character varying(100) NOT NULL,
    tool_name character varying(100) NOT NULL,
    tenant_id character varying(16),
    duration_ms integer NOT NULL,
    success boolean NOT NULL,
    error_message text,
    executed_at timestamp with time zone DEFAULT now()
);


--
-- Name: agent_registry; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.agent_registry (
    agent_id character varying(10) NOT NULL,
    product_key character varying(50) NOT NULL,
    name_en character varying(200) NOT NULL,
    name_ar character varying(200),
    domain_en character varying(100),
    domain_ar character varying(100),
    icon character varying(50),
    color character varying(20),
    route_patterns text[] DEFAULT '{}'::text[],
    delegation_scope character varying(50),
    quick_prompts jsonb DEFAULT '[]'::jsonb,
    enabled boolean DEFAULT true NOT NULL,
    sort_order integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: agent_status_log; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.agent_status_log (
    log_id uuid DEFAULT gen_random_uuid() NOT NULL,
    agent_user_id character varying(64) NOT NULL,
    from_status character varying(20) NOT NULL,
    to_status character varying(20) NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: agent_suggestions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.agent_suggestions (
    suggestion_id uuid DEFAULT gen_random_uuid() NOT NULL,
    agent_user_id character varying(64) NOT NULL,
    target_task_id character varying(200) NOT NULL,
    target_user_id character varying(64) NOT NULL,
    suggestion_text text NOT NULL,
    suggested_action character varying(200),
    prefill_data jsonb,
    accepted boolean,
    created_at timestamp with time zone DEFAULT now(),
    resolved_at timestamp with time zone
);


--
-- Name: agrc_event_log; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.agrc_event_log (
    event_id uuid DEFAULT gen_random_uuid() NOT NULL,
    event_type character varying(60) NOT NULL,
    source_service character varying(100) NOT NULL,
    entity_type character varying(60),
    entity_id character varying(200),
    severity character varying(20) DEFAULT 'info'::character varying NOT NULL,
    payload jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: agrc_metrics_snapshots; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.agrc_metrics_snapshots (
    snapshot_id uuid DEFAULT gen_random_uuid() NOT NULL,
    cycle_count integer DEFAULT 0,
    avg_cycle_ms integer DEFAULT 0,
    enforcement_rate numeric(5,2) DEFAULT 0,
    stale_control_pct numeric(5,2) DEFAULT 0,
    telemetry_ingestion_rate integer DEFAULT 0,
    event_count integer DEFAULT 0,
    critical_events integer DEFAULT 0,
    snapshot_at timestamp with time zone DEFAULT now()
);


--
-- Name: agrc_os_cycle_log; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.agrc_os_cycle_log (
    cycle_id uuid DEFAULT gen_random_uuid() NOT NULL,
    telemetry_ingested integer DEFAULT 0,
    controls_evaluated integer DEFAULT 0,
    risks_recomputed integer DEFAULT 0,
    policy_decisions integer DEFAULT 0,
    enforcement_actions integer DEFAULT 0,
    audit_entries integer DEFAULT 0,
    cycle_ms integer NOT NULL,
    executed_at timestamp with time zone DEFAULT now()
);


--
-- Name: agrc_runbooks; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.agrc_runbooks (
    runbook_id uuid DEFAULT gen_random_uuid() NOT NULL,
    trigger_event character varying(60) NOT NULL,
    name_en character varying(300) NOT NULL,
    name_ar character varying(300) NOT NULL,
    description_en text,
    description_ar text,
    automated_steps jsonb DEFAULT '[]'::jsonb NOT NULL,
    human_escalation_points jsonb DEFAULT '[]'::jsonb NOT NULL,
    severity_threshold character varying(20) DEFAULT 'warning'::character varying,
    enabled boolean DEFAULT true,
    version integer DEFAULT 1,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: ai_agent_status_log; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ai_agent_status_log (
    log_id uuid DEFAULT gen_random_uuid() NOT NULL,
    agent_user_id character varying(64) NOT NULL,
    agent_id character varying(10) NOT NULL,
    previous_status character varying(20) NOT NULL,
    new_status character varying(20) NOT NULL,
    workflow_execution_id uuid,
    step_id character varying(100),
    detail jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: ai_sessions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ai_sessions (
    session_id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    context jsonb DEFAULT '{}'::jsonb,
    messages jsonb DEFAULT '[]'::jsonb,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: ai_step_executions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ai_step_executions (
    execution_id uuid DEFAULT gen_random_uuid() NOT NULL,
    workflow_execution_id uuid NOT NULL,
    step_id character varying(100) NOT NULL,
    agent_id character varying(10) NOT NULL,
    agent_user_id character varying(64) NOT NULL,
    trigger_reason character varying(20) NOT NULL,
    input_context jsonb DEFAULT '{}'::jsonb,
    output_result jsonb DEFAULT '{}'::jsonb,
    confidence numeric(3,2) DEFAULT 0.0,
    status character varying(20) DEFAULT 'pending'::character varying NOT NULL,
    human_reviewed boolean DEFAULT false,
    review_decision character varying(20),
    reviewed_by character varying(64),
    created_at timestamp with time zone DEFAULT now(),
    reviewed_at timestamp with time zone
);


--
-- Name: ai_step_feedback; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ai_step_feedback (
    feedback_id uuid DEFAULT gen_random_uuid() NOT NULL,
    step_id character varying(100) NOT NULL,
    workflow_id uuid NOT NULL,
    user_id character varying(64) NOT NULL,
    suggestion_type character varying(20) NOT NULL,
    accepted boolean NOT NULL,
    modified boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: applicability_explanations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.applicability_explanations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    object_type character varying(30) NOT NULL,
    sector_id character varying(50) NOT NULL,
    ref_code character varying(100) NOT NULL,
    rule_id character varying(100),
    explanation_en text NOT NULL,
    explanation_ar text,
    evidence_link text,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: approval_chains; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.approval_chains (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id character varying(16) NOT NULL,
    workflow_type character varying(100) NOT NULL,
    chain_name character varying(200) NOT NULL,
    level_number integer NOT NULL,
    approver_role character varying(100),
    approver_user_id character varying(64),
    approver_team_id uuid,
    escalation_time_hours integer DEFAULT 48,
    auto_approve boolean DEFAULT false,
    conditions jsonb DEFAULT '{}'::jsonb,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    entity_type character varying(100),
    steps jsonb DEFAULT '[]'::jsonb NOT NULL,
    active boolean DEFAULT true NOT NULL
);


--
-- Name: approval_decisions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.approval_decisions (
    decision_id uuid DEFAULT gen_random_uuid() NOT NULL,
    approval_id uuid NOT NULL,
    approver_id text NOT NULL,
    step integer NOT NULL,
    decision character varying(20) NOT NULL,
    reason text,
    decided_at timestamp with time zone DEFAULT now()
);


--
-- Name: approval_pre_screens; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.approval_pre_screens (
    pre_screen_id uuid DEFAULT gen_random_uuid() NOT NULL,
    approval_id character varying(64) NOT NULL,
    agent_id character varying(64) NOT NULL,
    recommendation character varying(20) DEFAULT 'needs_review'::character varying NOT NULL,
    supporting_evidence jsonb DEFAULT '[]'::jsonb NOT NULL,
    gaps_found jsonb DEFAULT '[]'::jsonb NOT NULL,
    confidence_score integer DEFAULT 0 NOT NULL,
    summary text DEFAULT ''::text NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: approval_requests; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.approval_requests (
    approval_id uuid DEFAULT gen_random_uuid() NOT NULL,
    entity_type character varying(50) NOT NULL,
    entity_id uuid NOT NULL,
    action character varying(100) NOT NULL,
    requested_by text NOT NULL,
    route_id text NOT NULL,
    approver_chain jsonb DEFAULT '[]'::jsonb NOT NULL,
    current_step integer DEFAULT 0,
    status character varying(20) DEFAULT 'pending'::character varying NOT NULL,
    context jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    completed_at timestamp with time zone,
    chain_id uuid,
    submitted_by character varying(200)
);


--
-- Name: approval_steps_log; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.approval_steps_log (
    log_id uuid DEFAULT gen_random_uuid() NOT NULL,
    request_id uuid,
    step_number integer NOT NULL,
    action character varying(20) NOT NULL,
    actor_id character varying(200) NOT NULL,
    comments text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT approval_steps_log_action_check CHECK (((action)::text = ANY ((ARRAY['submitted'::character varying, 'approved'::character varying, 'rejected'::character varying, 'delegated'::character varying, 'escalated'::character varying])::text[])))
);


--
-- Name: audit_findings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.audit_findings (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id character varying(16) NOT NULL,
    audit_id character varying(100) NOT NULL,
    finding_ref character varying(100) NOT NULL,
    audit_type character varying(50),
    auditor_name character varying(200),
    audit_date date,
    finding_title text NOT NULL,
    finding_description text,
    severity character varying(50),
    affected_areas text[],
    root_cause text,
    management_response text,
    remediation_plan text,
    responsible_person character varying(255),
    target_date date,
    status character varying(50) DEFAULT 'open'::character varying,
    evidence_refs text[],
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: audit_merkle_witnesses; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.audit_merkle_witnesses (
    witness_id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id character varying(16),
    witness_date date NOT NULL,
    source_table character varying(50) NOT NULL,
    merkle_root character varying(64) NOT NULL,
    entry_count integer NOT NULL,
    first_entry_hash character varying(64),
    last_entry_hash character varying(64),
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: audit_prep_checklists; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.audit_prep_checklists (
    checklist_id uuid DEFAULT gen_random_uuid() NOT NULL,
    framework_id character varying(64) NOT NULL,
    agent_id character varying(64) DEFAULT 'AGENT-A05'::character varying NOT NULL,
    audit_team_lead_id character varying(64) NOT NULL,
    items jsonb DEFAULT '[]'::jsonb NOT NULL,
    status character varying(20) DEFAULT 'draft'::character varying NOT NULL,
    gap_count integer DEFAULT 0 NOT NULL,
    ready_count integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: audit_schedules; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.audit_schedules (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id character varying(16) NOT NULL,
    schedule_year integer NOT NULL,
    audit_name character varying(200) NOT NULL,
    audit_type character varying(50),
    audit_scope text,
    frameworks_covered text[],
    planned_start_date date,
    planned_end_date date,
    actual_start_date date,
    actual_end_date date,
    lead_auditor character varying(255),
    audit_team text[],
    status character varying(50) DEFAULT 'planned'::character varying,
    report_link text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: authority_matrix; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.authority_matrix (
    rule_id uuid DEFAULT gen_random_uuid() NOT NULL,
    decision_type character varying(50) NOT NULL,
    min_criticality character varying(20) NOT NULL,
    required_approver_role character varying(50) NOT NULL,
    escalation_timeout_hours integer DEFAULT 48 NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: authorization_audit_log; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.authorization_audit_log (
    audit_id bigint NOT NULL,
    user_id character varying(64) NOT NULL,
    function_code character varying(100),
    action character varying(64) NOT NULL,
    resource_type character varying(64),
    resource_id uuid,
    decision character varying(10) NOT NULL,
    matched_role_id uuid,
    matched_override_id uuid,
    reason text,
    context jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    tenant_id character varying(64),
    CONSTRAINT authorization_audit_log_decision_check CHECK (((decision)::text = ANY ((ARRAY['allow'::character varying, 'deny'::character varying])::text[])))
);

ALTER TABLE ONLY public.authorization_audit_log FORCE ROW LEVEL SECURITY;


--
-- Name: authorization_audit_log_audit_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.authorization_audit_log_audit_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: authorization_audit_log_audit_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.authorization_audit_log_audit_id_seq OWNED BY public.authorization_audit_log.audit_id;


--
-- Name: authorization_mismatch_log; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.authorization_mismatch_log (
    mismatch_id bigint NOT NULL,
    user_id character varying(64) NOT NULL,
    function_code character varying(100),
    action character varying(64) NOT NULL,
    resource_type character varying(64),
    legacy_allowed boolean,
    matrix_allowed boolean,
    matrix_reason text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: authorization_mismatch_log_mismatch_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.authorization_mismatch_log_mismatch_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: authorization_mismatch_log_mismatch_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.authorization_mismatch_log_mismatch_id_seq OWNED BY public.authorization_mismatch_log.mismatch_id;


--
-- Name: auto_task_config; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.auto_task_config (
    config_id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id character varying(100) NOT NULL,
    enabled boolean DEFAULT true,
    evidence_days_ahead integer DEFAULT 7,
    risk_days_ahead integer DEFAULT 7,
    vendor_days_ahead integer DEFAULT 14,
    auto_assign boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: autonomous_workflow_config; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.autonomous_workflow_config (
    config_id uuid DEFAULT gen_random_uuid() NOT NULL,
    enabled boolean DEFAULT true,
    sla_grace_multiplier numeric(3,2) DEFAULT 1.0,
    ai_can_execute_actions boolean DEFAULT true,
    ai_can_draft_approvals boolean DEFAULT true,
    require_human_review boolean DEFAULT true,
    cron_interval_minutes integer DEFAULT 5,
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: bcp_config; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.bcp_config (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id character varying(16) NOT NULL,
    config_type character varying(50) NOT NULL,
    business_function character varying(200) NOT NULL,
    criticality_tier character varying(50),
    rto_hours integer,
    rpo_hours integer,
    mtd_hours integer,
    dependencies jsonb DEFAULT '[]'::jsonb,
    recovery_strategy text,
    alternate_procedures text,
    responsible_team character varying(200),
    last_tested date,
    next_test_date date,
    test_results jsonb,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: cadence_overrides; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.cadence_overrides (
    domain character varying(255) NOT NULL,
    default_frequency character varying(100),
    override_frequency character varying(100)
);


--
-- Name: ccm_cycle_log; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ccm_cycle_log (
    cycle_id uuid DEFAULT gen_random_uuid() NOT NULL,
    controls_evaluated integer NOT NULL,
    stale_controls integer DEFAULT 0 NOT NULL,
    escalations_triggered integer DEFAULT 0 NOT NULL,
    risk_recalculated boolean DEFAULT false,
    cycle_ms integer NOT NULL,
    executed_at timestamp with time zone DEFAULT now()
);


--
-- Name: change_log; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.change_log (
    id bigint NOT NULL,
    table_name character varying(100) NOT NULL,
    record_key text NOT NULL,
    change_type character varying(10) NOT NULL,
    old_data jsonb,
    new_data jsonb,
    changed_fields text[],
    changed_by character varying(100) DEFAULT 'system'::character varying,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT change_log_change_type_check CHECK (((change_type)::text = ANY ((ARRAY['INSERT'::character varying, 'UPDATE'::character varying, 'SKIP'::character varying])::text[])))
);


--
-- Name: change_log_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.change_log_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: change_log_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.change_log_id_seq OWNED BY public.change_log.id;


--
-- Name: co_draft_sessions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.co_draft_sessions (
    session_id uuid DEFAULT gen_random_uuid() NOT NULL,
    entity_type character varying(30) NOT NULL,
    entity_id character varying(64) NOT NULL,
    agent_id character varying(64) NOT NULL,
    human_user_id character varying(64) NOT NULL,
    status character varying(20) DEFAULT 'drafting'::character varying NOT NULL,
    draft_content text DEFAULT ''::text NOT NULL,
    uncertain_sections jsonb DEFAULT '[]'::jsonb NOT NULL,
    human_resolutions jsonb DEFAULT '[]'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: command_history; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.command_history (
    history_id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    command_id character varying(100) NOT NULL,
    usage_count integer DEFAULT 1,
    last_used_at timestamp with time zone DEFAULT now()
);


--
-- Name: command_palette_history; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.command_palette_history (
    history_id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id character varying(100) NOT NULL,
    command_key character varying(200) NOT NULL,
    command_label character varying(500) NOT NULL,
    command_label_ar character varying(500),
    command_category character varying(50) DEFAULT 'navigation'::character varying NOT NULL,
    usage_count integer DEFAULT 1 NOT NULL,
    last_used_at timestamp with time zone DEFAULT now(),
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: company_profiles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.company_profiles (
    profile_id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id character varying(64) NOT NULL,
    company_name character varying(255) NOT NULL,
    industry_sector character varying(64) NOT NULL,
    employee_count character varying(16) NOT NULL,
    ksa_region character varying(64),
    subsidiaries jsonb DEFAULT '[]'::jsonb NOT NULL,
    applicable_frameworks jsonb DEFAULT '[]'::jsonb NOT NULL,
    recommended_roles jsonb DEFAULT '[]'::jsonb NOT NULL,
    maturity_level character varying(16) DEFAULT 'none'::character varying NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: compliance_mappings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.compliance_mappings (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id character varying(16),
    source_framework character varying(100) NOT NULL,
    source_control_id character varying(100) NOT NULL,
    target_framework character varying(100) NOT NULL,
    target_control_id character varying(100) NOT NULL,
    mapping_type character varying(50) DEFAULT 'equivalent'::character varying,
    confidence_score numeric(3,2) DEFAULT 1.0,
    notes text,
    is_verified boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: compliance_risks; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.compliance_risks (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    control_id uuid,
    risk_code character varying(100) NOT NULL,
    risk_title character varying(255) NOT NULL,
    risk_description text,
    risk_category character varying(100),
    non_compliance_impact character varying(20),
    likelihood_without_control character varying(20),
    residual_risk_with_control character varying(20),
    potential_penalties jsonb,
    regulatory_action_types text[],
    business_impact text,
    risk_appetite character varying(50),
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: config_entry_sources; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.config_entry_sources (
    entry_id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id character varying(64) NOT NULL,
    config_section character varying(64) NOT NULL,
    entry_key character varying(128) NOT NULL,
    source character varying(16) DEFAULT 'seeded'::character varying NOT NULL,
    reason text,
    last_seeded_at timestamp with time zone DEFAULT now(),
    last_manual_at timestamp with time zone
);


--
-- Name: content_packs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.content_packs (
    pack_id character varying(100) NOT NULL,
    version character varying(20) NOT NULL,
    framework_refs text[] NOT NULL,
    manifest jsonb NOT NULL,
    metadata jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: contextual_suggestions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.contextual_suggestions (
    suggestion_id uuid DEFAULT gen_random_uuid() NOT NULL,
    page_context character varying(200) NOT NULL,
    entity_type character varying(50),
    entity_id character varying(100),
    suggestion_type character varying(50) DEFAULT 'action'::character varying NOT NULL,
    title_en character varying(500) NOT NULL,
    title_ar character varying(500),
    description_en text,
    description_ar text,
    action_url character varying(500),
    priority integer DEFAULT 5 NOT NULL,
    conditions jsonb DEFAULT '{}'::jsonb,
    active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: control_cross_mappings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.control_cross_mappings (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    source_control_id uuid,
    target_control_id uuid,
    mapping_type character varying(50),
    coverage_percentage numeric(5,2),
    gap_analysis text,
    additional_requirements text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    source_control_code character varying(100),
    target_control_code character varying(100),
    confidence numeric(3,2) DEFAULT 0.85
);


--
-- Name: control_domains; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.control_domains (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    framework_code character varying(50),
    version_id uuid,
    domain_code character varying(50) NOT NULL,
    domain_name_en character varying(255) NOT NULL,
    domain_name_ar character varying(255),
    domain_number integer,
    description_en text,
    parent_domain_id uuid,
    weight_percentage numeric(5,2),
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: control_evidence_requirements; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.control_evidence_requirements (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    control_id uuid,
    framework_code character varying(50),
    control_number character varying(20),
    evidence_type_code character varying(50),
    is_mandatory boolean DEFAULT true,
    requirement_description_en text,
    requirement_description_ar text,
    expected_content_en text,
    expected_content_ar text,
    collection_frequency character varying(50),
    retention_period_months integer,
    maximum_age_days integer,
    requires_attestation boolean DEFAULT false,
    attestation_role character varying(100),
    display_order integer,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: control_regulator_mapping; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.control_regulator_mapping (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    control_id uuid,
    regulator_id character varying(50),
    enforcement_type character varying(50),
    enforcement_priority character varying(20),
    is_primary_enforcer boolean DEFAULT false,
    applicable_sectors text[],
    notes text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: regulators; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.regulators (
    regulator_id character varying(50) NOT NULL,
    name_en character varying(255) NOT NULL,
    name_ar character varying(255) NOT NULL,
    acronym character varying(20),
    category character varying(50),
    website character varying(255),
    mandate_note text,
    sectors text[] DEFAULT '{}'::text[],
    active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: regulatory_controls; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.regulatory_controls (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    domain_id uuid,
    control_code character varying(100) NOT NULL,
    control_number character varying(20),
    control_title_en character varying(500) NOT NULL,
    control_title_ar character varying(500),
    control_description_en text,
    control_objective_en text,
    control_type character varying(50),
    control_nature character varying(50),
    criticality_level character varying(20),
    implementation_guidance text,
    maturity_levels jsonb,
    dependencies text[],
    related_standards text[],
    automation_possible boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    search_vector tsvector
);


--
-- Name: control_multi_regulator_view; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.control_multi_regulator_view AS
 SELECT rc.control_code,
    rc.control_title_en,
    rc.criticality_level,
    count(DISTINCT crm.regulator_id) AS enforced_by_count,
    string_agg(DISTINCT (r.acronym)::text, ', '::text ORDER BY (r.acronym)::text) AS enforcing_regulators,
    string_agg(DISTINCT (
        CASE
            WHEN crm.is_primary_enforcer THEN (((r.acronym)::text || ' (Primary)'::text))::character varying
            ELSE r.acronym
        END)::text, ', '::text) AS regulator_roles,
    array_agg(DISTINCT crm.enforcement_type) AS enforcement_types
   FROM ((public.regulatory_controls rc
     JOIN public.control_regulator_mapping crm ON ((crm.control_id = rc.id)))
     JOIN public.regulators r ON (((r.regulator_id)::text = (crm.regulator_id)::text)))
  GROUP BY rc.control_code, rc.control_title_en, rc.criticality_level
 HAVING (count(DISTINCT crm.regulator_id) > 1)
  ORDER BY (count(DISTINCT crm.regulator_id)) DESC;


--
-- Name: control_requirements; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.control_requirements (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    control_id uuid,
    requirement_code character varying(100) NOT NULL,
    requirement_text_en text NOT NULL,
    requirement_text_ar text,
    requirement_type character varying(50),
    is_mandatory boolean DEFAULT true,
    applicability_condition jsonb,
    implementation_timeline_days integer,
    verification_method character varying(100),
    acceptable_evidence_types text[],
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: control_sectors; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.control_sectors (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    control_id uuid,
    framework_code character varying(50),
    control_number character varying(20),
    sector_code character varying(50),
    applicability character varying(50),
    sector_priority character varying(20),
    sector_maturity_level integer,
    sector_specific_guidance_en text,
    sector_specific_guidance_ar text,
    additional_evidence_types text,
    exemption_allowed boolean DEFAULT false,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    effective_from date DEFAULT CURRENT_DATE,
    effective_to date
);


--
-- Name: cross_mappings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.cross_mappings (
    mapping_id integer NOT NULL,
    source_node_id character varying(100),
    target_node_id character varying(100),
    relationship character varying(50) DEFAULT 'equivalent'::character varying,
    confidence numeric(3,2) DEFAULT 1.0,
    rationale text,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: cross_mappings_mapping_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.cross_mappings_mapping_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: cross_mappings_mapping_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.cross_mappings_mapping_id_seq OWNED BY public.cross_mappings.mapping_id;


--
-- Name: data_classifications; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.data_classifications (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id character varying(16) NOT NULL,
    classification_level character varying(50) NOT NULL,
    level_name character varying(100) NOT NULL,
    description text,
    handling_requirements text,
    encryption_required boolean DEFAULT false,
    access_controls text,
    retention_period_days integer,
    disposal_method character varying(100),
    data_types text[],
    applicable_regulations text[],
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    deleted_at timestamp with time zone
);


--
-- Name: data_governance_config; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.data_governance_config (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id character varying(16) NOT NULL,
    config_area character varying(100) NOT NULL,
    config_key character varying(200) NOT NULL,
    config_value jsonb NOT NULL,
    applicable_systems text[],
    responsible_role character varying(100),
    review_frequency character varying(50),
    last_reviewed date,
    next_review date,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: department_roles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.department_roles (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id character varying(16) NOT NULL,
    department_id uuid NOT NULL,
    role_type character varying(100) NOT NULL,
    framework_responsibilities text[],
    control_domains text[],
    risk_categories text[],
    primary_contact_email character varying(255),
    backup_contact_email character varying(255),
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: edition_limits; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.edition_limits (
    plan character varying(50) NOT NULL,
    max_users integer DEFAULT 10,
    max_frameworks integer DEFAULT 5,
    max_assessments integer DEFAULT 20,
    features jsonb DEFAULT '{}'::jsonb
);


--
-- Name: email_verification_tokens; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.email_verification_tokens (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id character varying(64) NOT NULL,
    token character varying(128) NOT NULL,
    expires_at timestamp with time zone NOT NULL,
    verified_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: enforcement_gate_log; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.enforcement_gate_log (
    gate_log_id uuid DEFAULT gen_random_uuid() NOT NULL,
    gate_type character varying(20) NOT NULL,
    subject_id character varying(200) NOT NULL,
    subject_name character varying(500),
    allowed boolean NOT NULL,
    reason text,
    requested_by character varying(64),
    details jsonb DEFAULT '{}'::jsonb,
    overridden boolean DEFAULT false,
    overridden_by character varying(64),
    override_justification text,
    overridden_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: engagement_misalignment; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.engagement_misalignment (
    misalignment_id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id character varying(64) NOT NULL,
    module character varying(64) NOT NULL,
    misalignment_type character varying(32) NOT NULL,
    seeded boolean DEFAULT false NOT NULL,
    usage_score numeric(5,2) DEFAULT 0,
    suggestion text,
    status character varying(20) DEFAULT 'detected'::character varying NOT NULL,
    detected_at timestamp with time zone DEFAULT now() NOT NULL,
    resolved_at timestamp with time zone
);


--
-- Name: engagement_os_cycle_log; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.engagement_os_cycle_log (
    cycle_id uuid DEFAULT gen_random_uuid() NOT NULL,
    overdue_items_found integer DEFAULT 0,
    reminders_sent integer DEFAULT 0,
    sla_breaches_escalated integer DEFAULT 0,
    scores_computed integer DEFAULT 0,
    regulator_requests_flagged integer DEFAULT 0,
    consultant_alerts_published integer DEFAULT 0,
    events_published integer DEFAULT 0,
    cycle_ms integer NOT NULL,
    executed_at timestamp with time zone DEFAULT now()
);


--
-- Name: entity_link_metadata; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.entity_link_metadata (
    metadata_id uuid DEFAULT gen_random_uuid() NOT NULL,
    link_id uuid NOT NULL,
    key character varying(100) NOT NULL,
    value text,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: entity_links; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.entity_links (
    link_id uuid DEFAULT gen_random_uuid() NOT NULL,
    source_type character varying(50) NOT NULL,
    source_id uuid NOT NULL,
    target_type character varying(50) NOT NULL,
    target_id uuid NOT NULL,
    relationship_type character varying(50) NOT NULL,
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now(),
    created_by uuid NOT NULL
);


--
-- Name: erp_connections; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.erp_connections (
    connection_id uuid DEFAULT gen_random_uuid() NOT NULL,
    name character varying(300) NOT NULL,
    erp_type character varying(30) NOT NULL,
    endpoint_url character varying(500) NOT NULL,
    auth_method character varying(20) NOT NULL,
    credentials_encrypted text NOT NULL,
    sync_schedule_cron character varying(100) DEFAULT '0 2 * * *'::character varying,
    sync_enabled boolean DEFAULT true,
    last_validated_at timestamp with time zone,
    validation_status character varying(20) DEFAULT 'pending'::character varying,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT erp_connections_auth_method_check CHECK (((auth_method)::text = ANY ((ARRAY['oauth2'::character varying, 'api_key'::character varying, 'basic'::character varying])::text[]))),
    CONSTRAINT erp_connections_erp_type_check CHECK (((erp_type)::text = ANY ((ARRAY['sap'::character varying, 'oracle'::character varying, 'dynamics365'::character varying, 'generic_rest'::character varying])::text[])))
);


--
-- Name: erp_field_mappings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.erp_field_mappings (
    mapping_id uuid DEFAULT gen_random_uuid() NOT NULL,
    connection_id uuid NOT NULL,
    source_field_path character varying(500) NOT NULL,
    target_entity character varying(100) NOT NULL,
    target_field character varying(200) NOT NULL,
    transformation_rule jsonb,
    mapping_config_json text NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: erp_sync_history; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.erp_sync_history (
    sync_id uuid DEFAULT gen_random_uuid() NOT NULL,
    connection_id uuid NOT NULL,
    status character varying(20) DEFAULT 'running'::character varying NOT NULL,
    records_fetched integer DEFAULT 0,
    records_created integer DEFAULT 0,
    records_updated integer DEFAULT 0,
    errors jsonb DEFAULT '[]'::jsonb,
    duration_ms integer,
    started_at timestamp with time zone DEFAULT now(),
    completed_at timestamp with time zone,
    CONSTRAINT erp_sync_history_status_check CHECK (((status)::text = ANY ((ARRAY['running'::character varying, 'completed'::character varying, 'failed'::character varying])::text[])))
);


--
-- Name: escalation_rules; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.escalation_rules (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id character varying(16) NOT NULL,
    rule_type character varying(50) NOT NULL,
    rule_name character varying(200) NOT NULL,
    trigger_condition jsonb NOT NULL,
    escalation_path jsonb NOT NULL,
    notification_template text,
    max_escalation_level integer DEFAULT 5,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: escalation_thresholds; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.escalation_thresholds (
    level integer NOT NULL,
    timeout_hours integer NOT NULL,
    notify_role character varying(50) NOT NULL,
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: event_type_registry; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.event_type_registry (
    event_type character varying(100) NOT NULL,
    namespace character varying(50) NOT NULL,
    event_name character varying(50) NOT NULL,
    product_key character varying(50),
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: evidence_config; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.evidence_config (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id character varying(16) NOT NULL,
    evidence_type character varying(100) NOT NULL,
    evidence_name character varying(200) NOT NULL,
    description text,
    collection_method character varying(50),
    collection_frequency character varying(50),
    retention_days integer DEFAULT 365,
    storage_location character varying(200),
    file_naming_pattern character varying(200),
    required_attributes jsonb DEFAULT '[]'::jsonb,
    validation_rules jsonb DEFAULT '[]'::jsonb,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: evidence_lifecycle; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.evidence_lifecycle (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    evidence_requirement_id uuid,
    lifecycle_stage character varying(50) NOT NULL,
    stage_duration_days integer,
    notification_before_days integer,
    auto_transition boolean DEFAULT false,
    transition_criteria jsonb,
    escalation_after_days integer,
    escalation_to_role character varying(100),
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: evidence_relay_queue; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.evidence_relay_queue (
    relay_id uuid DEFAULT gen_random_uuid() NOT NULL,
    evidence_id character varying(64),
    control_id character varying(64) NOT NULL,
    agent_id character varying(64) NOT NULL,
    source_system character varying(100) DEFAULT 'manual'::character varying NOT NULL,
    staged_content text DEFAULT ''::text NOT NULL,
    confidence_score integer DEFAULT 0 NOT NULL,
    status character varying(20) DEFAULT 'staged'::character varying NOT NULL,
    reviewed_by character varying(64),
    review_note text,
    created_at timestamp with time zone DEFAULT now(),
    resolved_at timestamp with time zone
);


--
-- Name: evidence_requirements; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.evidence_requirements (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    requirement_id uuid,
    evidence_type character varying(100) NOT NULL,
    evidence_name character varying(255) NOT NULL,
    evidence_description text,
    format_requirements text[],
    content_requirements text[],
    validity_period_days integer,
    refresh_frequency_days integer,
    collection_method character varying(100),
    responsible_role character varying(100),
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: evidence_types; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.evidence_types (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    evidence_code character varying(50) NOT NULL,
    evidence_name_en character varying(255) NOT NULL,
    evidence_name_ar character varying(255),
    evidence_category character varying(50),
    description_en text,
    file_extensions text[],
    max_size_mb integer,
    is_active boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: exception_management; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.exception_management (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id character varying(16) NOT NULL,
    exception_type character varying(50) NOT NULL,
    reference_id character varying(200) NOT NULL,
    exception_reason text NOT NULL,
    risk_acceptance boolean DEFAULT false,
    compensating_controls text,
    requested_by character varying(255) NOT NULL,
    approved_by character varying(255),
    approval_date date,
    start_date date NOT NULL,
    end_date date NOT NULL,
    status character varying(50) DEFAULT 'pending'::character varying,
    review_frequency character varying(50),
    last_review_date date,
    next_review_date date,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: execution_plan_snapshots; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.execution_plan_snapshots (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id character varying(64) NOT NULL,
    blueprint_id uuid NOT NULL,
    planner_version character varying(20) NOT NULL,
    plan_json jsonb NOT NULL,
    checksum character varying(64) NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: first_visits; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.first_visits (
    tenant_id character varying(64) NOT NULL,
    user_id character varying(64) NOT NULL,
    module character varying(64) NOT NULL,
    visited_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: framework_alias; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.framework_alias (
    alias_code character varying(80) NOT NULL,
    framework_code character varying(50) NOT NULL,
    source text DEFAULT 'migration_017'::text,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: framework_relationships; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.framework_relationships (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    source_framework character varying(50),
    target_framework character varying(50),
    relationship_type character varying(50),
    mapping_percentage numeric(5,2),
    notes text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: framework_scoring_policies; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.framework_scoring_policies (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    framework_code character varying(50) NOT NULL,
    scoring_model character varying(50) DEFAULT 'binary'::character varying NOT NULL,
    maturity_levels jsonb,
    passing_threshold numeric(5,2) DEFAULT 60.0,
    weight_by_criticality boolean DEFAULT true,
    description_en text,
    description_ar text,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: framework_version_diffs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.framework_version_diffs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    framework_code character varying(50) NOT NULL,
    from_version character varying(20),
    to_version character varying(20),
    change_type character varying(50) NOT NULL,
    change_category character varying(50),
    severity character varying(20),
    entity_type character varying(50),
    field_changed character varying(100),
    old_value text,
    new_value text,
    change_description_en text,
    change_description_ar text,
    impact_description_en text,
    requires_reassessment boolean DEFAULT false,
    transition_months integer DEFAULT 0,
    controls_added integer DEFAULT 0,
    controls_removed integer DEFAULT 0,
    controls_modified integer DEFAULT 0,
    is_major_update boolean DEFAULT false,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: framework_versions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.framework_versions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    framework_code character varying(50),
    version_number character varying(20) NOT NULL,
    version_name character varying(255),
    release_date date NOT NULL,
    effective_date date NOT NULL,
    sunset_date date,
    transition_period_months integer,
    major_changes text[],
    total_controls integer,
    total_requirements integer,
    compliance_levels text[],
    documentation_url text,
    is_current boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: function_authorities; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.function_authorities (
    authority_id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    function_code character varying(100) NOT NULL,
    action character varying(64) NOT NULL,
    resource_type character varying(64) NOT NULL,
    allow boolean DEFAULT true NOT NULL,
    max_risk_level character varying(20),
    conditions jsonb DEFAULT '{}'::jsonb NOT NULL,
    priority integer DEFAULT 100 NOT NULL,
    active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: governance_config; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.governance_config (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id character varying(16) NOT NULL,
    config_key character varying(100) NOT NULL,
    config_value jsonb NOT NULL,
    category character varying(50),
    description text,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: governance_risk_appetite; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.governance_risk_appetite (
    category character varying(100) NOT NULL,
    max_residual_score numeric(6,2) NOT NULL,
    acceptance_requires_role character varying(50) NOT NULL,
    review_cadence_days integer DEFAULT 90 NOT NULL,
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: handoff_log; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.handoff_log (
    handoff_id uuid DEFAULT gen_random_uuid() NOT NULL,
    source_participant_id character varying(64) NOT NULL,
    target_participant_id character varying(64) NOT NULL,
    task_id character varying(200) NOT NULL,
    direction character varying(20) NOT NULL,
    context jsonb DEFAULT '{}'::jsonb,
    reason text,
    status character varying(20) DEFAULT 'initiated'::character varying,
    error_context jsonb,
    partial_results jsonb,
    created_at timestamp with time zone DEFAULT now(),
    completed_at timestamp with time zone,
    CONSTRAINT handoff_log_direction_check CHECK (((direction)::text = ANY ((ARRAY['human_to_agent'::character varying, 'agent_to_human'::character varying])::text[]))),
    CONSTRAINT handoff_log_status_check CHECK (((status)::text = ANY ((ARRAY['initiated'::character varying, 'in_progress'::character varying, 'completed'::character varying, 'error'::character varying])::text[])))
);


--
-- Name: incident_categories; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.incident_categories (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id character varying(16) NOT NULL,
    category_code character varying(100) NOT NULL,
    category_name character varying(200) NOT NULL,
    parent_category character varying(100),
    severity_levels jsonb DEFAULT '["low", "medium", "high", "critical"]'::jsonb,
    sla_hours jsonb DEFAULT '{"low": 72, "high": 4, "medium": 24, "critical": 1}'::jsonb,
    escalation_required boolean DEFAULT false,
    notification_list text[],
    response_template text,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: inline_edit_history; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.inline_edit_history (
    edit_id uuid DEFAULT gen_random_uuid() NOT NULL,
    entity_type character varying(50) NOT NULL,
    entity_id character varying(100) NOT NULL,
    field_name character varying(100) NOT NULL,
    old_value text,
    new_value text,
    edited_by character varying(100) NOT NULL,
    validated boolean DEFAULT true,
    validation_errors jsonb DEFAULT '[]'::jsonb,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: instrument_structure; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.instrument_structure (
    node_id character varying(100) NOT NULL,
    instrument_id character varying(100),
    parent_node_id character varying(100),
    level integer NOT NULL,
    code character varying(50) NOT NULL,
    title_en character varying(500) NOT NULL,
    title_ar character varying(500) NOT NULL,
    description_en text,
    description_ar text,
    priority character varying(20),
    automatable boolean DEFAULT false,
    evidence_types text[] DEFAULT '{}'::text[],
    sort_order integer DEFAULT 0,
    owner character varying(255),
    status character varying(50) DEFAULT 'not_assessed'::character varying
);


--
-- Name: instruments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.instruments (
    instrument_id character varying(100) NOT NULL,
    regulator_id character varying(50),
    name_en character varying(255) NOT NULL,
    name_ar character varying(255) NOT NULL,
    type character varying(50) NOT NULL,
    version character varying(50),
    version_id character varying(100),
    publication_date date,
    effective_date date,
    status character varying(20) DEFAULT 'active'::character varying,
    sectors text[] DEFAULT '{}'::text[],
    mandatory boolean DEFAULT false,
    summary_en text,
    summary_ar text,
    tags text[] DEFAULT '{}'::text[],
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: integrations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.integrations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id character varying(16) NOT NULL,
    integration_type character varying(100) NOT NULL,
    integration_name character varying(200) NOT NULL,
    provider character varying(100),
    connection_config jsonb DEFAULT '{}'::jsonb,
    sync_frequency character varying(50),
    last_sync_date timestamp with time zone,
    next_sync_date timestamp with time zone,
    sync_status character varying(50),
    data_mapping jsonb DEFAULT '{}'::jsonb,
    is_bidirectional boolean DEFAULT false,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: intervention_audit_log; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.intervention_audit_log (
    intervention_id uuid DEFAULT gen_random_uuid() NOT NULL,
    workflow_step_id character varying(200) NOT NULL,
    admin_user_id character varying(64) NOT NULL,
    original_assignee_id character varying(64),
    intervention_type character varying(30) NOT NULL,
    justification text NOT NULL,
    before_state jsonb DEFAULT '{}'::jsonb,
    after_state jsonb DEFAULT '{}'::jsonb,
    new_assignee_id character varying(64),
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT intervention_audit_log_intervention_type_check CHECK (((intervention_type)::text = ANY ((ARRAY['override_approve'::character varying, 'override_reject'::character varying, 'reassign'::character varying, 'escalate'::character varying, 'complete_on_behalf'::character varying])::text[])))
);


--
-- Name: isic_risks; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.isic_risks (
    isic_code character(1) NOT NULL,
    risk_id uuid NOT NULL,
    weight numeric(3,2) DEFAULT 1.00,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: job_executions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.job_executions (
    execution_id uuid DEFAULT gen_random_uuid() NOT NULL,
    job_name character varying(100),
    started_at timestamp with time zone DEFAULT now(),
    completed_at timestamp with time zone,
    status character varying(20) NOT NULL,
    duration_ms integer,
    error_message text
);


--
-- Name: job_registry; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.job_registry (
    job_name character varying(100) NOT NULL,
    cron_expression character varying(100) NOT NULL,
    enabled boolean DEFAULT true,
    last_run_at timestamp with time zone,
    last_status character varying(20),
    last_error text,
    next_run_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: journey_state; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.journey_state (
    state_id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id character varying(64) NOT NULL,
    user_id character varying(64) NOT NULL,
    current_phase character varying(32) DEFAULT 'setup'::character varying NOT NULL,
    completed_steps jsonb DEFAULT '[]'::jsonb NOT NULL,
    conversation_history jsonb DEFAULT '[]'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: kri_config; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.kri_config (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id character varying(16) NOT NULL,
    kri_code character varying(100) NOT NULL,
    kri_name character varying(200) NOT NULL,
    description text,
    risk_category character varying(100),
    measurement_type character varying(50),
    calculation_formula text,
    data_source character varying(200),
    collection_frequency character varying(50),
    threshold_green numeric,
    threshold_amber numeric,
    threshold_red numeric,
    current_value numeric,
    last_measured_at timestamp with time zone,
    owner_email character varying(255),
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: landing_content; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.landing_content (
    content_id character varying(50) NOT NULL,
    section character varying(50) NOT NULL,
    sort_order integer DEFAULT 0,
    icon character varying(50),
    title_en character varying(500),
    title_ar character varying(500),
    desc_en text,
    desc_ar text,
    viz_type character varying(30),
    chart_data jsonb DEFAULT '{}'::jsonb,
    metadata jsonb DEFAULT '{}'::jsonb,
    active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: langgraph_checkpoints; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.langgraph_checkpoints (
    thread_id character varying(255) NOT NULL,
    checkpoint_id character varying(255) NOT NULL,
    parent_id character varying(255),
    checkpoint jsonb NOT NULL,
    metadata jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: lead_captures; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.lead_captures (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    lead_type character varying(30) NOT NULL,
    name character varying(255),
    email character varying(255) NOT NULL,
    company character varying(255),
    phone character varying(50),
    message text,
    metadata jsonb DEFAULT '{}'::jsonb,
    status character varying(20) DEFAULT 'new'::character varying NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT lead_captures_lead_type_check CHECK (((lead_type)::text = ANY ((ARRAY['contact'::character varying, 'demo_request'::character varying, 'newsletter'::character varying])::text[]))),
    CONSTRAINT lead_captures_status_check CHECK (((status)::text = ANY ((ARRAY['new'::character varying, 'contacted'::character varying, 'qualified'::character varying, 'converted'::character varying, 'dismissed'::character varying])::text[])))
);


--
-- Name: lifecycle_checkpoints; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.lifecycle_checkpoints (
    checkpoint_id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id character varying(64) NOT NULL,
    checkpoint_type character varying(32) NOT NULL,
    status character varying(20) DEFAULT 'pending'::character varying NOT NULL,
    scheduled_at timestamp with time zone NOT NULL,
    started_at timestamp with time zone,
    completed_at timestamp with time zone,
    original_score numeric(5,2),
    new_score numeric(5,2),
    config_drift jsonb DEFAULT '{}'::jsonb,
    questions_surfaced integer DEFAULT 0,
    answers_changed integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: lifecycle_template_injections; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.lifecycle_template_injections (
    injection_id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id character varying(64) NOT NULL,
    stage character varying(32) NOT NULL,
    template_key character varying(128) NOT NULL,
    template_type character varying(32) NOT NULL,
    injected_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: login_attempts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.login_attempts (
    attempt_id uuid DEFAULT gen_random_uuid() NOT NULL,
    email character varying(255) NOT NULL,
    ip_address inet,
    success boolean NOT NULL,
    attempted_at timestamp with time zone DEFAULT now()
);


--
-- Name: lookup_approval_authorities; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.lookup_approval_authorities (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    authority_code character varying(50) NOT NULL,
    authority_name_en text NOT NULL,
    authority_name_ar text NOT NULL,
    sort_order integer DEFAULT 0 NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: lookup_approval_models; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.lookup_approval_models (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    model_code character varying(50) NOT NULL,
    model_name_en text NOT NULL,
    model_name_ar text NOT NULL,
    description_en text,
    description_ar text,
    sort_order integer DEFAULT 0 NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: lookup_authority_frameworks; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.lookup_authority_frameworks (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    authority_code character varying(20),
    framework_code character varying(50),
    framework_name character varying(255),
    framework_version character varying(20),
    issue_date date,
    mandatory_for_sectors text[],
    compliance_deadline date,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: lookup_authority_sector_mapping; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.lookup_authority_sector_mapping (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    authority_code character varying(20),
    sector_code character(1),
    regulation_type character varying(50),
    specific_activities text[],
    notes text,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    enforcement character varying(20) DEFAULT 'mandatory'::character varying NOT NULL,
    priority integer DEFAULT 100 NOT NULL,
    reason_en text,
    reason_ar text,
    CONSTRAINT chk_enforcement CHECK (((enforcement)::text = ANY ((ARRAY['mandatory'::character varying, 'recommended'::character varying])::text[])))
);


--
-- Name: lookup_automation_levels; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.lookup_automation_levels (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    level_code character varying(50) NOT NULL,
    level_name_en text NOT NULL,
    level_name_ar text NOT NULL,
    sort_order integer DEFAULT 0 NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: lookup_cities; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.lookup_cities (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    city_code character varying(50) NOT NULL,
    city_name_en text NOT NULL,
    city_name_ar text NOT NULL,
    country_code character varying(10),
    is_capital boolean DEFAULT false,
    timezone character varying(50),
    is_active boolean DEFAULT true NOT NULL,
    sort_order integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: lookup_cloud_providers; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.lookup_cloud_providers (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    provider_code character varying(50) NOT NULL,
    provider_name_en text NOT NULL,
    provider_name_ar text NOT NULL,
    sort_order integer DEFAULT 0 NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: lookup_connectors; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.lookup_connectors (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    connector_code character varying(50) NOT NULL,
    connector_name_en text NOT NULL,
    connector_name_ar text NOT NULL,
    category character varying(50),
    icon_class character varying(50),
    sort_order integer DEFAULT 0 NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: lookup_control_testing; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.lookup_control_testing (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    approach_code character varying(50) NOT NULL,
    approach_name_en text NOT NULL,
    approach_name_ar text NOT NULL,
    automation_level integer,
    sort_order integer DEFAULT 0 NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: lookup_countries; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.lookup_countries (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    country_code character varying(10) NOT NULL,
    name_en text NOT NULL,
    name_ar text NOT NULL,
    flag_emoji text,
    dial_code character varying(10),
    continent character varying(50),
    currency_code character varying(10),
    is_active boolean DEFAULT true NOT NULL,
    sort_order integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    country_code_3 character varying(3) NOT NULL
);


--
-- Name: lookup_data_classifications; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.lookup_data_classifications (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    classification_code character varying(50) NOT NULL,
    classification_name_en text NOT NULL,
    classification_name_ar text NOT NULL,
    level_number integer DEFAULT 0 NOT NULL,
    color_code character varying(20),
    sort_order integer DEFAULT 0 NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: lookup_data_residency; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.lookup_data_residency (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    residency_code character varying(50) NOT NULL,
    residency_name_en text NOT NULL,
    residency_name_ar text NOT NULL,
    sort_order integer DEFAULT 0 NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: lookup_data_sources; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.lookup_data_sources (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    table_name character varying(100) NOT NULL,
    source_name character varying(255) NOT NULL,
    source_url text,
    source_document character varying(255),
    source_date date,
    last_verified date,
    verification_notes text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: lookup_department_types; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.lookup_department_types (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    dept_code character varying(50) NOT NULL,
    dept_name_en text NOT NULL,
    dept_name_ar text NOT NULL,
    is_grc_critical boolean DEFAULT false NOT NULL,
    sort_order integer DEFAULT 0 NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: lookup_employee_ranges; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.lookup_employee_ranges (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    range_code character varying(50) NOT NULL,
    range_label_en text NOT NULL,
    range_label_ar text NOT NULL,
    min_employees integer,
    max_employees integer,
    enterprise_type character varying(50),
    is_active boolean DEFAULT true NOT NULL,
    sort_order integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: lookup_escalation_models; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.lookup_escalation_models (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    model_code character varying(50) NOT NULL,
    model_name_en text NOT NULL,
    model_name_ar text NOT NULL,
    description_en text,
    description_ar text,
    sort_order integer DEFAULT 0 NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: lookup_finding_categories; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.lookup_finding_categories (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    category_code character varying(50) NOT NULL,
    category_name_en text NOT NULL,
    category_name_ar text NOT NULL,
    sort_order integer DEFAULT 0 NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: lookup_framework_module_triggers; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.lookup_framework_module_triggers (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    framework_code character varying(50) NOT NULL,
    module_code character varying(50) NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: lookup_frameworks; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.lookup_frameworks (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    framework_code character varying(50) NOT NULL,
    framework_name text NOT NULL,
    framework_acronym character varying(30),
    description_en text,
    description_ar text,
    regulatory_body character varying(100),
    jurisdiction character varying(100),
    compliance_level character varying(50),
    is_active boolean DEFAULT true NOT NULL,
    sort_order integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    applicable_sectors jsonb
);


--
-- Name: lookup_frequencies; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.lookup_frequencies (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    frequency_code character varying(50) NOT NULL,
    frequency_name_en text NOT NULL,
    frequency_name_ar text NOT NULL,
    interval_days integer,
    sort_order integer DEFAULT 0 NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: lookup_gdpr_levels; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.lookup_gdpr_levels (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    level_code character varying(50) NOT NULL,
    level_name_en text NOT NULL,
    level_name_ar text NOT NULL,
    sort_order integer DEFAULT 0 NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: lookup_grc_role_staffing; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.lookup_grc_role_staffing (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    range_code character varying(20) NOT NULL,
    sector_code character varying(50) DEFAULT '*'::character varying,
    role_code character varying(100) NOT NULL,
    role_name_en text NOT NULL,
    role_name_ar text,
    role_category character varying(50) DEFAULT 'core'::character varying,
    recommended_fte numeric(4,1) DEFAULT 1.0 NOT NULL,
    is_mandatory boolean DEFAULT false NOT NULL,
    priority integer DEFAULT 50 NOT NULL,
    shahin_title_en text,
    shahin_title_ar text,
    description_en text,
    description_ar text,
    is_active boolean DEFAULT true NOT NULL,
    sort_order integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: lookup_grc_tools; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.lookup_grc_tools (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tool_code character varying(50) NOT NULL,
    tool_name_en text NOT NULL,
    tool_name_ar text NOT NULL,
    vendor character varying(100),
    sort_order integer DEFAULT 0 NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: lookup_incident_categories; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.lookup_incident_categories (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    category_code character varying(50) NOT NULL,
    category_name_en text NOT NULL,
    category_name_ar text NOT NULL,
    severity character varying(20),
    sort_order integer DEFAULT 0 NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: lookup_isic4_sectors; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.lookup_isic4_sectors (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    section_code character(1) NOT NULL,
    sector_name_en character varying(255) NOT NULL,
    sector_name_ar character varying(255),
    description_en text,
    division_range character varying(20),
    total_divisions integer,
    applicable_regulators text[],
    applicable_frameworks text[],
    is_active boolean DEFAULT true NOT NULL,
    sort_order integer NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: lookup_ksa_cities; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.lookup_ksa_cities (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    city_code character varying(20) NOT NULL,
    city_name_en character varying(100) NOT NULL,
    city_name_ar character varying(100) NOT NULL,
    province_code character varying(10) NOT NULL,
    city_type character varying(50),
    population_estimate integer,
    is_provincial_capital boolean DEFAULT false,
    is_major_urban_center boolean DEFAULT false,
    latitude numeric(10,8),
    longitude numeric(11,8),
    is_active boolean DEFAULT true NOT NULL,
    sort_order integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: lookup_ksa_provinces; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.lookup_ksa_provinces (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    province_code character varying(10) NOT NULL,
    province_name_en character varying(100) NOT NULL,
    province_name_ar character varying(100) NOT NULL,
    capital_city_en character varying(100) NOT NULL,
    capital_city_ar character varying(100),
    region_type character varying(50),
    governorates_count integer,
    established_date date DEFAULT '1992-03-02'::date,
    is_active boolean DEFAULT true NOT NULL,
    sort_order integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: lookup_ksa_regulatory_authorities; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.lookup_ksa_regulatory_authorities (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    authority_code character varying(20) NOT NULL,
    authority_name_en character varying(255) NOT NULL,
    authority_name_ar character varying(255),
    authority_acronym character varying(20) NOT NULL,
    authority_type character varying(50),
    parent_ministry character varying(255),
    website_url character varying(255),
    establishment_decree character varying(100),
    establishment_date date,
    mandate_en text,
    regulated_sectors text[],
    key_regulations text[],
    enforcement_powers text[],
    is_active boolean DEFAULT true NOT NULL,
    sort_order integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: lookup_languages; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.lookup_languages (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    language_code character varying(10) NOT NULL,
    language_name_en text NOT NULL,
    language_name_native text NOT NULL,
    rtl boolean DEFAULT false,
    is_primary boolean DEFAULT false,
    is_active boolean DEFAULT true NOT NULL,
    sort_order integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: lookup_maturity_levels; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.lookup_maturity_levels (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    level_code character varying(50) NOT NULL,
    level_name_en text NOT NULL,
    level_name_ar text NOT NULL,
    description_en text,
    description_ar text,
    level_number integer DEFAULT 0 NOT NULL,
    color_code character varying(20),
    sort_order integer DEFAULT 0 NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: lookup_nca_sectors; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.lookup_nca_sectors (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    sector_code character varying(50) NOT NULL,
    sector_name_en text NOT NULL,
    sector_name_ar text NOT NULL,
    sort_order integer DEFAULT 0 NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: lookup_org_models; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.lookup_org_models (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    model_code character varying(50) NOT NULL,
    model_name_en text NOT NULL,
    model_name_ar text NOT NULL,
    sort_order integer DEFAULT 0 NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: lookup_org_types; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.lookup_org_types (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    type_code character varying(50) NOT NULL,
    type_name_en text NOT NULL,
    type_name_ar text,
    description_en text,
    description_ar text,
    legal_category character varying(50),
    is_active boolean DEFAULT true NOT NULL,
    sort_order integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: lookup_outsourced_functions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.lookup_outsourced_functions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    function_code character varying(50) NOT NULL,
    function_name_en text NOT NULL,
    function_name_ar text NOT NULL,
    sort_order integer DEFAULT 0 NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: lookup_pci_levels; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.lookup_pci_levels (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    level_code character varying(50) NOT NULL,
    level_name_en text NOT NULL,
    level_name_ar text NOT NULL,
    sort_order integer DEFAULT 0 NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: lookup_pdpl_scopes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.lookup_pdpl_scopes (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    scope_code character varying(50) NOT NULL,
    scope_name_en text NOT NULL,
    scope_name_ar text NOT NULL,
    sort_order integer DEFAULT 0 NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: lookup_register_formats; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.lookup_register_formats (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    format_code character varying(50) NOT NULL,
    format_name_en text NOT NULL,
    format_name_ar text NOT NULL,
    sort_order integer DEFAULT 0 NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: lookup_reporting_lines; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.lookup_reporting_lines (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    role_code character varying(50) NOT NULL,
    role_name_en text NOT NULL,
    role_name_ar text NOT NULL,
    sort_order integer DEFAULT 0 NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: lookup_reporting_obligations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.lookup_reporting_obligations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    obligation_code character varying(50) NOT NULL,
    obligation_name_en text NOT NULL,
    obligation_name_ar text NOT NULL,
    sort_order integer DEFAULT 0 NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: lookup_risk_appetites; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.lookup_risk_appetites (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    appetite_code character varying(50) NOT NULL,
    appetite_name_en text NOT NULL,
    appetite_name_ar text NOT NULL,
    description_en text,
    description_ar text,
    sort_order integer DEFAULT 0 NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: lookup_risk_methodologies; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.lookup_risk_methodologies (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    method_code character varying(50) NOT NULL,
    method_name_en text NOT NULL,
    method_name_ar text NOT NULL,
    sort_order integer DEFAULT 0 NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: lookup_sector_team_templates; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.lookup_sector_team_templates (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    sector_code character varying(50) NOT NULL,
    function_code character varying(50),
    priority character varying(20) DEFAULT 'recommended'::character varying NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    team_function_code character varying(100),
    is_mandatory boolean DEFAULT false,
    is_recommended boolean DEFAULT true,
    minimum_size integer,
    notes text
);


--
-- Name: lookup_sectors; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.lookup_sectors (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    sector_code character varying(50) NOT NULL,
    sector_name_en text NOT NULL,
    sector_name_ar text NOT NULL,
    parent_sector_code character varying(50),
    icon_class character varying(100),
    level integer DEFAULT 1,
    typical_frameworks text[],
    is_active boolean DEFAULT true NOT NULL,
    sort_order integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    description_en text,
    description_ar text,
    regulatory_requirements text[]
);


--
-- Name: lookup_sla_tiers; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.lookup_sla_tiers (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    sla_code character varying(50) NOT NULL,
    sla_name_en text NOT NULL,
    sla_name_ar text NOT NULL,
    hours integer,
    severity character varying(20),
    sort_order integer DEFAULT 0 NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: lookup_sso_protocols; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.lookup_sso_protocols (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    protocol_code character varying(50) NOT NULL,
    protocol_name_en text NOT NULL,
    protocol_name_ar text NOT NULL,
    sort_order integer DEFAULT 0 NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: lookup_sso_providers; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.lookup_sso_providers (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    provider_code character varying(50) NOT NULL,
    provider_name_en text NOT NULL,
    provider_name_ar text NOT NULL,
    protocol character varying(30),
    icon_class character varying(50),
    sort_order integer DEFAULT 0 NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: lookup_team_control_mapping; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.lookup_team_control_mapping (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    function_code character varying(50),
    control_domain character varying(100) NOT NULL,
    control_domain_en text,
    control_domain_ar text,
    responsibility character varying(20) DEFAULT 'responsible'::character varying NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    team_function_code character varying(100),
    framework character varying(100),
    is_primary boolean DEFAULT false
);


--
-- Name: lookup_team_framework_mapping; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.lookup_team_framework_mapping (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    team_function_code character varying(100) NOT NULL,
    framework_code character varying(100) NOT NULL,
    framework_section character varying(200),
    responsibility_level character varying(50),
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: lookup_team_functions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.lookup_team_functions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    function_code character varying(50) NOT NULL,
    function_name_en text NOT NULL,
    function_name_ar text,
    description_en text,
    description_ar text,
    category character varying(50) DEFAULT 'general'::character varying,
    is_core boolean DEFAULT false NOT NULL,
    min_org_size character varying(20) DEFAULT '1_10'::character varying,
    is_active boolean DEFAULT true NOT NULL,
    sort_order integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    typical_size_min integer,
    typical_size_max integer,
    is_grc_critical boolean DEFAULT false,
    required_for_sectors text[]
);


--
-- Name: lookup_timezones; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.lookup_timezones (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    timezone_code character varying(100) NOT NULL,
    timezone_name text NOT NULL,
    utc_offset character varying(10),
    utc_offset_minutes integer,
    countries text[],
    is_active boolean DEFAULT true NOT NULL,
    sort_order integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: lookup_transfer_mechanisms; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.lookup_transfer_mechanisms (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    mechanism_code character varying(50) NOT NULL,
    mechanism_name_en text NOT NULL,
    mechanism_name_ar text NOT NULL,
    sort_order integer DEFAULT 0 NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: regulatory_frameworks; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.regulatory_frameworks (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    authority_code character varying(20),
    framework_code character varying(50) NOT NULL,
    framework_name_en character varying(255) NOT NULL,
    framework_name_ar character varying(255),
    framework_acronym character varying(50),
    framework_type character varying(50),
    description_en text,
    scope_en text,
    applicability_criteria jsonb,
    related_frameworks text[],
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: major_framework_updates; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.major_framework_updates AS
 SELECT fvd.framework_code,
    rf.framework_name_en,
    fvd.from_version,
    fvd.to_version,
    fvd.change_description_en,
    fvd.impact_description_en,
    fvd.transition_months,
    fvd.controls_added,
    fvd.controls_removed,
    fvd.controls_modified,
    (fvd.controls_added + fvd.controls_modified) AS total_changes
   FROM (public.framework_version_diffs fvd
     JOIN public.regulatory_frameworks rf ON (((rf.framework_code)::text = (fvd.framework_code)::text)))
  WHERE ((fvd.is_major_update = true) AND ((fvd.change_type)::text = 'control_count_change'::text))
  ORDER BY fvd.framework_code, fvd.from_version;


--
-- Name: manifest_cache; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.manifest_cache (
    tenant_id character varying(50) NOT NULL,
    etag character varying(64) NOT NULL,
    payload jsonb NOT NULL,
    expires_at timestamp with time zone NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: manifest_snapshots; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.manifest_snapshots (
    snapshot_id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id character varying(50) NOT NULL,
    manifest_hash character varying(64) NOT NULL,
    module_count integer DEFAULT 0 NOT NULL,
    payload jsonb NOT NULL,
    reason character varying(100) DEFAULT 'auto'::character varying,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: maturity_assessments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.maturity_assessments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id character varying(16) NOT NULL,
    assessment_name character varying(200) NOT NULL,
    assessment_type character varying(100),
    assessment_date date,
    overall_level character varying(50),
    domain_scores jsonb DEFAULT '{}'::jsonb,
    strengths text[],
    weaknesses text[],
    recommendations text[],
    improvement_plan text,
    next_assessment_date date,
    assessor_name character varying(255),
    assessment_report_link text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: maturity_questions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.maturity_questions (
    question_id character varying(20) NOT NULL,
    category character varying(50) NOT NULL,
    domain character varying(50) NOT NULL,
    text_en text NOT NULL,
    text_ar text NOT NULL,
    answer_type character varying(20) DEFAULT 'scale'::character varying NOT NULL,
    options_en text[],
    options_ar text[],
    weight integer DEFAULT 3 NOT NULL,
    sort_order integer NOT NULL,
    tags text[] DEFAULT '{}'::text[],
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: maturity_snapshots; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.maturity_snapshots (
    snapshot_id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id character varying(64) NOT NULL,
    overall_score numeric(5,2) NOT NULL,
    components jsonb DEFAULT '[]'::jsonb NOT NULL,
    computed_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: migration_config; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.migration_config (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id character varying(16) NOT NULL,
    migration_type character varying(100) NOT NULL,
    source_system character varying(200),
    mapping_rules jsonb DEFAULT '{}'::jsonb,
    transformation_scripts text,
    validation_rules jsonb DEFAULT '[]'::jsonb,
    last_migration_date timestamp with time zone,
    migration_status character varying(50),
    records_migrated integer,
    records_failed integer,
    error_log text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: module_activation_requests; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.module_activation_requests (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id character varying(64) NOT NULL,
    module_code character varying(30) NOT NULL,
    session_id uuid,
    requested_by character varying(64) NOT NULL,
    status character varying(30) DEFAULT 'pending'::character varying,
    approved_by character varying(64),
    approved_at timestamp with time zone,
    rejection_reason text,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: module_activation_requirements; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.module_activation_requirements (
    id integer NOT NULL,
    product_key character varying(50) DEFAULT 'agrc'::character varying NOT NULL,
    module_code character varying(50) NOT NULL,
    check_phase character varying(20) NOT NULL,
    check_key character varying(100) NOT NULL,
    check_params jsonb DEFAULT '{}'::jsonb,
    severity character varying(10) DEFAULT 'blocking'::character varying NOT NULL,
    description_en text NOT NULL,
    description_ar text,
    required_agents text[],
    required_events text[],
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: module_activation_requirements_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.module_activation_requirements_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: module_activation_requirements_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.module_activation_requirements_id_seq OWNED BY public.module_activation_requirements.id;


--
-- Name: module_provisioning_steps; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.module_provisioning_steps (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    module_code character varying(30) NOT NULL,
    step_code character varying(80) NOT NULL,
    step_name character varying(255) NOT NULL,
    sequence_no integer NOT NULL,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: mv_authority_coverage; Type: MATERIALIZED VIEW; Schema: public; Owner: -
--

CREATE MATERIALIZED VIEW public.mv_authority_coverage AS
 SELECT a.authority_code,
    a.authority_name_en,
    a.authority_name_ar,
    a.authority_acronym,
    a.authority_type,
    (count(DISTINCT af.framework_code))::integer AS framework_count,
    (count(DISTINCT asm.sector_code))::integer AS sector_count,
    (COALESCE(( SELECT count(*) AS count
           FROM (public.regulatory_controls rc
             JOIN public.control_domains cd ON ((cd.id = rc.domain_id)))
          WHERE ((cd.framework_code)::text = ANY ((ARRAY( SELECT af2.framework_code
                   FROM public.lookup_authority_frameworks af2
                  WHERE (((af2.authority_code)::text = (a.authority_code)::text) AND af2.is_active)))::text[]))), (0)::bigint))::integer AS total_controls
   FROM ((public.lookup_ksa_regulatory_authorities a
     LEFT JOIN public.lookup_authority_frameworks af ON ((((af.authority_code)::text = (a.authority_code)::text) AND af.is_active)))
     LEFT JOIN public.lookup_authority_sector_mapping asm ON ((((asm.authority_code)::text = (a.authority_code)::text) AND asm.is_active)))
  WHERE a.is_active
  GROUP BY a.authority_code, a.authority_name_en, a.authority_name_ar, a.authority_acronym, a.authority_type
  ORDER BY ((count(DISTINCT af.framework_code))::integer) DESC
  WITH NO DATA;


--
-- Name: mv_cross_mapping_matrix; Type: MATERIALIZED VIEW; Schema: public; Owner: -
--

CREATE MATERIALIZED VIEW public.mv_cross_mapping_matrix AS
 SELECT split_part((control_cross_mappings.source_control_code)::text, '::'::text, 1) AS source_framework,
    split_part((control_cross_mappings.target_control_code)::text, '::'::text, 1) AS target_framework,
    (count(*))::integer AS mapping_count,
    round(avg(control_cross_mappings.confidence), 2) AS avg_confidence,
    (count(*) FILTER (WHERE ((control_cross_mappings.mapping_type)::text = 'equivalent'::text)))::integer AS equivalent_count,
    (count(*) FILTER (WHERE ((control_cross_mappings.mapping_type)::text = 'partial'::text)))::integer AS partial_count,
    (count(*) FILTER (WHERE ((control_cross_mappings.mapping_type)::text = 'related'::text)))::integer AS related_count
   FROM public.control_cross_mappings
  WHERE ((control_cross_mappings.source_control_code IS NOT NULL) AND (control_cross_mappings.target_control_code IS NOT NULL))
  GROUP BY (split_part((control_cross_mappings.source_control_code)::text, '::'::text, 1)), (split_part((control_cross_mappings.target_control_code)::text, '::'::text, 1))
  ORDER BY ((count(*))::integer) DESC
  WITH NO DATA;


--
-- Name: mv_framework_control_distribution; Type: MATERIALIZED VIEW; Schema: public; Owner: -
--

CREATE MATERIALIZED VIEW public.mv_framework_control_distribution AS
 SELECT cd.framework_code,
    COALESCE(lf.framework_name, (cd.framework_code)::text) AS framework_name,
    COALESCE(lf.regulatory_body, 'Unknown'::character varying) AS authority,
    COALESCE(lf.jurisdiction, 'KSA'::character varying) AS jurisdiction,
    (count(DISTINCT cd.id))::integer AS domain_count,
    (count(rc.id))::integer AS control_count,
    (count(rc.id) FILTER (WHERE ((rc.criticality_level)::text = 'critical'::text)))::integer AS critical_controls,
    (count(rc.id) FILTER (WHERE ((rc.criticality_level)::text = 'high'::text)))::integer AS high_controls,
    (count(rc.id) FILTER (WHERE ((rc.criticality_level)::text = 'medium'::text)))::integer AS medium_controls,
    (count(rc.id) FILTER (WHERE ((rc.criticality_level)::text = 'low'::text)))::integer AS low_controls,
    (count(rc.id) FILTER (WHERE rc.automation_possible))::integer AS automatable_controls,
    (count(cer.id))::integer AS evidence_requirements
   FROM (((public.control_domains cd
     LEFT JOIN public.regulatory_controls rc ON ((rc.domain_id = cd.id)))
     LEFT JOIN public.control_evidence_requirements cer ON ((cer.control_id = rc.id)))
     LEFT JOIN public.lookup_frameworks lf ON (((lf.framework_code)::text = (cd.framework_code)::text)))
  GROUP BY cd.framework_code, lf.framework_name, lf.regulatory_body, lf.jurisdiction
  ORDER BY ((count(rc.id))::integer) DESC
  WITH NO DATA;


--
-- Name: sectors; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sectors (
    sector_id character varying(50) NOT NULL,
    name_en character varying(255) NOT NULL,
    name_ar character varying(255) NOT NULL,
    parent_sector_id character varying(50),
    applicable_regulators text[] DEFAULT '{}'::text[],
    applicable_frameworks text[] DEFAULT '{}'::text[],
    country_code character(3),
    vertical_code text,
    status character varying(20) DEFAULT 'active'::character varying,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: mv_regulatory_catalog_summary; Type: MATERIALIZED VIEW; Schema: public; Owner: -
--

CREATE MATERIALIZED VIEW public.mv_regulatory_catalog_summary AS
 SELECT (( SELECT count(*) AS count
           FROM public.lookup_ksa_regulatory_authorities
          WHERE lookup_ksa_regulatory_authorities.is_active))::integer AS total_authorities,
    (( SELECT count(*) AS count
           FROM public.lookup_authority_frameworks
          WHERE lookup_authority_frameworks.is_active))::integer AS total_frameworks,
    (( SELECT count(*) AS count
           FROM public.regulatory_controls))::integer AS total_controls,
    (( SELECT count(*) AS count
           FROM public.control_evidence_requirements))::integer AS total_evidence_requirements,
    (( SELECT count(*) AS count
           FROM public.control_cross_mappings))::integer AS total_cross_mappings,
    (( SELECT count(DISTINCT cd.framework_code) AS count
           FROM public.control_domains cd))::integer AS frameworks_with_controls,
    (( SELECT count(*) AS count
           FROM public.sectors
          WHERE ((sectors.status)::text = 'active'::text)))::integer AS total_sectors,
    now() AS refreshed_at
  WITH NO DATA;


--
-- Name: mv_sector_regulatory_burden; Type: MATERIALIZED VIEW; Schema: public; Owner: -
--

CREATE MATERIALIZED VIEW public.mv_sector_regulatory_burden AS
 SELECT s.section_code AS sector_code,
    s.sector_name_en,
    COALESCE(s.sector_name_ar, s.sector_name_en) AS sector_name_ar,
    (count(DISTINCT asm.authority_code))::integer AS authority_count,
    (count(DISTINCT af.framework_code))::integer AS framework_count,
    (COALESCE(( SELECT count(*) AS count
           FROM (public.regulatory_controls rc
             JOIN public.control_domains cd ON ((cd.id = rc.domain_id)))
          WHERE ((cd.framework_code)::text = ANY ((ARRAY( SELECT DISTINCT af2.framework_code
                   FROM (public.lookup_authority_frameworks af2
                     JOIN public.lookup_authority_sector_mapping asm2 ON (((asm2.authority_code)::text = (af2.authority_code)::text)))
                  WHERE ((asm2.sector_code = s.section_code) AND asm2.is_active AND af2.is_active)))::text[]))), (0)::bigint))::integer AS control_count
   FROM ((public.lookup_isic4_sectors s
     LEFT JOIN public.lookup_authority_sector_mapping asm ON (((asm.sector_code = s.section_code) AND asm.is_active)))
     LEFT JOIN public.lookup_authority_frameworks af ON ((((af.authority_code)::text = (asm.authority_code)::text) AND af.is_active)))
  GROUP BY s.section_code, s.sector_name_en, s.sector_name_ar
  ORDER BY ((count(DISTINCT af.framework_code))::integer) DESC
  WITH NO DATA;


--
-- Name: notification_preferences; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.notification_preferences (
    preference_id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    activity_type character varying(50) NOT NULL,
    module character varying(100) NOT NULL,
    enabled boolean DEFAULT true,
    channels text[] DEFAULT ARRAY['in_app'::text],
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: nudge_feedback; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.nudge_feedback (
    feedback_id uuid DEFAULT gen_random_uuid() NOT NULL,
    nudge_id character varying(64) NOT NULL,
    user_id character varying(64) NOT NULL,
    action character varying(20) NOT NULL,
    reason character varying(30) NOT NULL,
    free_text text,
    agent_follow_up text,
    follow_up_task_id character varying(64),
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: nudges; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.nudges (
    nudge_id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id character varying(64) NOT NULL,
    user_id character varying(64) NOT NULL,
    type character varying(32) NOT NULL,
    title_en character varying(512) NOT NULL,
    title_ar character varying(512) NOT NULL,
    body_en text,
    body_ar text,
    target_module character varying(128),
    target_action character varying(128),
    priority character varying(16) DEFAULT 'medium'::character varying NOT NULL,
    dismissed boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: onboarding_activity_log; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.onboarding_activity_log (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    session_id uuid NOT NULL,
    user_id character varying(64) NOT NULL,
    activity_type character varying(100) NOT NULL,
    activity_description text,
    metadata_json jsonb DEFAULT '{}'::jsonb NOT NULL,
    ip_address inet,
    user_agent text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: onboarding_answer_history; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.onboarding_answer_history (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    session_id uuid NOT NULL,
    question_code character varying(150) NOT NULL,
    old_value_json jsonb,
    new_value_json jsonb,
    changed_by_user_id character varying(64) NOT NULL,
    changed_at timestamp with time zone DEFAULT now() NOT NULL,
    tenant_id character varying(16),
    tenant_slug character varying(64),
    changed_by_email character varying(255),
    changed_by_role character varying(64)
);


--
-- Name: onboarding_answers; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.onboarding_answers (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    session_id uuid NOT NULL,
    question_code character varying(150) NOT NULL,
    answer_text text,
    answer_number numeric(18,4),
    answer_bool boolean,
    answer_date date,
    answer_json jsonb,
    answered_by_user_id character varying(64) NOT NULL,
    source character varying(50) DEFAULT 'user'::character varying NOT NULL,
    version integer DEFAULT 1 NOT NULL,
    answered_at timestamp with time zone DEFAULT now() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    tenant_id character varying(16),
    tenant_slug character varying(64),
    answered_by_email character varying(255),
    answered_by_role character varying(64)
);


--
-- Name: onboarding_answers_legacy_v1; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.onboarding_answers_legacy_v1 (
    snapshot_id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id character varying(64) NOT NULL,
    assessment_id uuid,
    answers jsonb DEFAULT '{}'::jsonb NOT NULL,
    intelligence_report jsonb,
    version integer DEFAULT 1 NOT NULL,
    trigger_type character varying(32) DEFAULT 'initial'::character varying NOT NULL,
    changed_fields jsonb DEFAULT '[]'::jsonb,
    created_by character varying(64) NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: onboarding_attachments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.onboarding_attachments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    session_id uuid NOT NULL,
    question_code character varying(100) NOT NULL,
    file_name character varying(500) NOT NULL,
    file_type character varying(100),
    file_size_bytes bigint,
    storage_path text NOT NULL,
    uploaded_at timestamp with time zone DEFAULT now(),
    uploaded_by character varying(64)
);


--
-- Name: onboarding_blockers; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.onboarding_blockers (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    session_id uuid NOT NULL,
    blocker_code character varying(150) NOT NULL,
    severity character varying(30) DEFAULT 'high'::character varying NOT NULL,
    title_en text NOT NULL,
    title_ar text NOT NULL,
    description_en text,
    description_ar text,
    resolution_action text,
    is_resolved boolean DEFAULT false NOT NULL,
    resolved_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    stage_code character varying(100),
    question_code character varying(100)
);


--
-- Name: onboarding_dynamic_lookups; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.onboarding_dynamic_lookups (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    lookup_code character varying(100) NOT NULL,
    value_code character varying(100) NOT NULL,
    value_text_en text NOT NULL,
    value_text_ar text,
    description_en text,
    description_ar text,
    metadata jsonb,
    category character varying(100) NOT NULL,
    sort_order integer DEFAULT 0 NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: onboarding_field_guidance; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.onboarding_field_guidance (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    question_id uuid NOT NULL,
    guidance_type character varying(50) DEFAULT 'info'::character varying NOT NULL,
    title_en text,
    title_ar text,
    content_en text,
    content_ar text,
    example_values text[],
    show_icon boolean DEFAULT true NOT NULL,
    icon_class character varying(100),
    color_class character varying(50),
    "position" character varying(20) DEFAULT 'below'::character varying,
    trigger_event character varying(50) DEFAULT 'focus'::character varying,
    sort_order integer DEFAULT 0 NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: onboarding_notifications; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.onboarding_notifications (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    session_id uuid NOT NULL,
    user_id character varying(64) NOT NULL,
    notification_type character varying(50) NOT NULL,
    title text NOT NULL,
    message text NOT NULL,
    metadata_json jsonb DEFAULT '{}'::jsonb NOT NULL,
    is_read boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: onboarding_progress; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.onboarding_progress (
    progress_id uuid DEFAULT gen_random_uuid() NOT NULL,
    session_token character varying(64) NOT NULL,
    tenant_id character varying(64),
    user_id character varying(64),
    phase integer DEFAULT 1 NOT NULL,
    phase1_page integer DEFAULT 0 NOT NULL,
    answers jsonb DEFAULT '{}'::jsonb NOT NULL,
    categories jsonb,
    active_category_key character varying(64),
    cat_page integer DEFAULT 0,
    category_status jsonb DEFAULT '{}'::jsonb,
    assessment_id uuid,
    saved_at timestamp with time zone DEFAULT now() NOT NULL,
    expires_at timestamp with time zone DEFAULT (now() + '30 days'::interval) NOT NULL
);


--
-- Name: onboarding_question_bank; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.onboarding_question_bank (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    question_code character varying(150) NOT NULL,
    stage_code character varying(100) NOT NULL,
    section_code character varying(100) NOT NULL,
    question_type character varying(50) NOT NULL,
    label_en text NOT NULL,
    label_ar text NOT NULL,
    help_text_en text,
    help_text_ar text,
    placeholder_en text,
    placeholder_ar text,
    options_json jsonb DEFAULT '[]'::jsonb NOT NULL,
    validation_json jsonb DEFAULT '{}'::jsonb NOT NULL,
    visibility_rule_json jsonb DEFAULT '{}'::jsonb NOT NULL,
    impact_rule_json jsonb DEFAULT '{}'::jsonb NOT NULL,
    is_required boolean DEFAULT false NOT NULL,
    sort_order integer DEFAULT 0 NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    lookup_table character varying(100),
    lookup_depends_on character varying(150),
    tooltip_en text,
    tooltip_ar text,
    signals jsonb DEFAULT '{}'::jsonb NOT NULL,
    information_gain_weight numeric(5,2) DEFAULT 1.0 NOT NULL,
    child_fields_json jsonb,
    ui_variant text,
    module_code character varying(30) DEFAULT 'workspace_setup'::character varying,
    answer_inherits_from character varying(100),
    default_value_json jsonb,
    suggestion_source character varying(30),
    product_key character varying(50) DEFAULT 'agrc'::character varying
);


--
-- Name: onboarding_question_options; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.onboarding_question_options (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    question_id uuid NOT NULL,
    option_code character varying(100) NOT NULL,
    option_value text NOT NULL,
    option_label_en text NOT NULL,
    option_label_ar text,
    description_en text,
    description_ar text,
    icon_class character varying(100),
    color_code character varying(20),
    triggers_questions text[],
    impacts jsonb,
    is_default boolean DEFAULT false NOT NULL,
    sort_order integer DEFAULT 0 NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: onboarding_question_types; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.onboarding_question_types (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    type_code character varying(50) NOT NULL,
    type_name character varying(100),
    ui_component character varying(100),
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: onboarding_questions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.onboarding_questions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    question_code character varying(100) NOT NULL,
    stage_code character varying(50) NOT NULL,
    question_type_id uuid,
    question_text_en text NOT NULL,
    question_text_ar text,
    help_text_en text,
    help_text_ar text,
    placeholder_en text,
    placeholder_ar text,
    tooltip_en text,
    tooltip_ar text,
    is_required boolean DEFAULT false NOT NULL,
    is_conditional boolean DEFAULT false NOT NULL,
    condition_rules jsonb,
    validation_rules jsonb,
    default_value text,
    lookup_table character varying(100),
    lookup_filter jsonb,
    allow_custom_value boolean DEFAULT false NOT NULL,
    display_order integer DEFAULT 0 NOT NULL,
    display_group character varying(100),
    display_width character varying(20) DEFAULT 'full'::character varying,
    icon_class character varying(100),
    impacts_provisioning boolean DEFAULT false NOT NULL,
    impacts_compliance boolean DEFAULT false NOT NULL,
    compliance_frameworks text[],
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: onboarding_recommendations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.onboarding_recommendations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    session_id uuid NOT NULL,
    recommendation_type character varying(100) NOT NULL,
    recommendation_code character varying(150) NOT NULL,
    title_en text NOT NULL,
    title_ar text NOT NULL,
    description_en text,
    description_ar text,
    priority character varying(30) DEFAULT 'medium'::character varying NOT NULL,
    source_rule_code character varying(150),
    payload_json jsonb DEFAULT '{}'::jsonb NOT NULL,
    status character varying(30) DEFAULT 'active'::character varying NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: onboarding_scores; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.onboarding_scores (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    session_id uuid NOT NULL,
    score_type character varying(100) NOT NULL,
    score_domain character varying(100) NOT NULL,
    score_value numeric(8,2) NOT NULL,
    max_score numeric(8,2) NOT NULL,
    rating_label character varying(100),
    explanation_json jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: onboarding_sections; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.onboarding_sections (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    session_id uuid NOT NULL,
    stage_code character varying(100) NOT NULL,
    section_code character varying(100) NOT NULL,
    status character varying(40) DEFAULT 'not_started'::character varying NOT NULL,
    is_required boolean DEFAULT true NOT NULL,
    sort_order integer DEFAULT 0 NOT NULL,
    completion_percent numeric(5,2) DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: onboarding_seed_mappings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.onboarding_seed_mappings (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    question_code character varying(100) NOT NULL,
    target_schema character varying(10) DEFAULT 'tenant'::character varying NOT NULL,
    target_table character varying(100) NOT NULL,
    target_key_columns jsonb DEFAULT '{}'::jsonb NOT NULL,
    target_column character varying(100) NOT NULL,
    value_source text NOT NULL,
    transform character varying(30) DEFAULT 'direct'::character varying NOT NULL,
    transform_config jsonb DEFAULT '{}'::jsonb,
    upsert_strategy character varying(20) DEFAULT 'upsert'::character varying NOT NULL,
    when_rule jsonb,
    module_code character varying(30) DEFAULT 'workspace_setup'::character varying NOT NULL,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: onboarding_sessions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.onboarding_sessions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    session_key character varying(100) NOT NULL,
    status character varying(40) DEFAULT 'draft'::character varying NOT NULL,
    tenant_id character varying(64),
    workspace_id character varying(64),
    started_by_user_id character varying(64) NOT NULL,
    organization_name character varying(255),
    display_name character varying(255),
    language_code character varying(10) DEFAULT 'en'::character varying NOT NULL,
    progress_percent numeric(5,2) DEFAULT 0 NOT NULL,
    readiness_score numeric(5,2) DEFAULT 0 NOT NULL,
    blockers_count integer DEFAULT 0 NOT NULL,
    current_stage_code character varying(100),
    started_at timestamp with time zone DEFAULT now() NOT NULL,
    last_saved_at timestamp with time zone,
    approved_at timestamp with time zone,
    provisioning_started_at timestamp with time zone,
    provisioning_completed_at timestamp with time zone,
    completed_at timestamp with time zone,
    version integer DEFAULT 1 NOT NULL,
    metadata_json jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    session_code character varying(100),
    user_id uuid,
    session_status character varying(50),
    source character varying(50),
    metadata jsonb,
    last_activity_at timestamp with time zone,
    current_stage character varying(50),
    completed_stages character varying[],
    expires_at timestamp with time zone,
    overall_readiness_score numeric(5,2),
    stage_scores jsonb,
    category_scores jsonb,
    ip_address character varying(50),
    user_agent text,
    module_code character varying(30) DEFAULT 'workspace_setup'::character varying,
    parent_session_id uuid
);


--
-- Name: onboarding_stage_definitions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.onboarding_stage_definitions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    stage_code character varying(50) NOT NULL,
    sort_order integer DEFAULT 0 NOT NULL,
    icon_class character varying(100),
    label_en text NOT NULL,
    label_ar text NOT NULL,
    description_en text,
    description_ar text,
    is_required boolean DEFAULT true NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    min_readiness_score numeric(5,2) DEFAULT 0,
    max_completion_days integer DEFAULT 30,
    validation_rules jsonb,
    metadata jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: onboarding_stages; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.onboarding_stages (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    session_id uuid NOT NULL,
    stage_code character varying(100) NOT NULL,
    display_order integer NOT NULL,
    status character varying(40) DEFAULT 'not_started'::character varying NOT NULL,
    percent_complete numeric(5,2) DEFAULT 0 NOT NULL,
    started_at timestamp with time zone,
    completed_at timestamp with time zone,
    validated_at timestamp with time zone,
    validation_summary_json jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: onboarding_translations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.onboarding_translations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    translation_key character varying(200) NOT NULL,
    text_en text,
    text_ar text,
    text_fr text,
    text_es text,
    text_de text,
    text_zh text,
    text_ja text,
    text_ru text,
    context character varying(100),
    module character varying(50) DEFAULT 'onboarding'::character varying NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    is_html boolean DEFAULT false NOT NULL,
    variables text[],
    max_length integer,
    notes text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: onboarding_ui_config; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.onboarding_ui_config (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    config_key character varying(100) NOT NULL,
    config_value text NOT NULL,
    value_type character varying(20) DEFAULT 'string'::character varying NOT NULL,
    category character varying(50) DEFAULT 'general'::character varying NOT NULL,
    description text,
    is_active boolean DEFAULT true NOT NULL,
    is_editable boolean DEFAULT true NOT NULL,
    min_value numeric,
    max_value numeric,
    allowed_values text[],
    default_value text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: onboarding_user_answers; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.onboarding_user_answers (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    session_id uuid NOT NULL,
    user_id uuid NOT NULL,
    tenant_id character varying(50),
    question_id uuid NOT NULL,
    question_code character varying(100),
    answer_value text,
    answer_json jsonb,
    answer_type character varying(50) DEFAULT 'text'::character varying,
    is_valid boolean DEFAULT true NOT NULL,
    validation_errors jsonb DEFAULT '[]'::jsonb,
    time_spent_seconds integer DEFAULT 0,
    change_count integer DEFAULT 0 NOT NULL,
    created_by uuid,
    updated_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: ontology_evidence_categories; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ontology_evidence_categories (
    id character varying(50) NOT NULL,
    name_en character varying(255) NOT NULL,
    name_ar character varying(255),
    icon character varying(50),
    status character varying(20) DEFAULT 'active'::character varying,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: ontology_layers; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ontology_layers (
    id character varying(50) NOT NULL,
    name_en character varying(255) NOT NULL,
    name_ar character varying(255),
    sort_order integer DEFAULT 0 NOT NULL,
    status character varying(20) DEFAULT 'active'::character varying,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: ontology_role_blueprints; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ontology_role_blueprints (
    id character varying(50) NOT NULL,
    name_en character varying(255) NOT NULL,
    name_ar character varying(255),
    abbreviation character varying(20),
    permissions text[],
    status character varying(20) DEFAULT 'active'::character varying,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: ontology_scoring_policies; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ontology_scoring_policies (
    id character varying(50) NOT NULL,
    name_en character varying(255) NOT NULL,
    name_ar character varying(255),
    scale character varying(30),
    levels integer,
    status character varying(20) DEFAULT 'active'::character varying,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: org_hierarchy; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.org_hierarchy (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id character varying(16) NOT NULL,
    child_unit_id uuid NOT NULL,
    parent_unit_id uuid NOT NULL,
    hierarchy_level integer NOT NULL,
    reporting_type character varying(50),
    effective_from date,
    effective_to date,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: organization_units; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.organization_units (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id character varying(16) NOT NULL,
    unit_code character varying(100) NOT NULL,
    unit_name character varying(200) NOT NULL,
    unit_type character varying(50) NOT NULL,
    parent_unit_id uuid,
    unit_head_email character varying(255),
    location character varying(200),
    cost_center character varying(50),
    employee_count integer,
    is_grc_critical boolean DEFAULT false,
    attributes jsonb DEFAULT '{}'::jsonb,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: password_reset_tokens; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.password_reset_tokens (
    token_id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id character varying(64),
    token_hash character varying(255) NOT NULL,
    expires_at timestamp with time zone NOT NULL,
    used boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: payments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.payments (
    payment_id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id character varying(100) NOT NULL,
    gateway character varying(20) NOT NULL,
    external_payment_id character varying(255),
    amount numeric(12,2) NOT NULL,
    currency character varying(3) DEFAULT 'SAR'::character varying NOT NULL,
    status character varying(30) DEFAULT 'pending'::character varying NOT NULL,
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    subscription_id uuid,
    amount_sar integer DEFAULT 0 NOT NULL,
    amount_usd integer DEFAULT 0 NOT NULL,
    billing_cycle character varying(20),
    payment_method character varying(50),
    invoice_url text,
    receipt_url text,
    failure_reason text,
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: pending_assignment_queue; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.pending_assignment_queue (
    queue_id uuid DEFAULT gen_random_uuid() NOT NULL,
    instance_id character varying(200) NOT NULL,
    assignee_user_id character varying(64) NOT NULL,
    task_id character varying(200) NOT NULL,
    payload jsonb DEFAULT '{}'::jsonb NOT NULL,
    status character varying(20) DEFAULT 'queued'::character varying,
    retry_count integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT now(),
    delivered_at timestamp with time zone,
    CONSTRAINT pending_assignment_queue_status_check CHECK (((status)::text = ANY ((ARRAY['queued'::character varying, 'delivered'::character varying, 'failed'::character varying])::text[])))
);


--
-- Name: platform_email_approvals; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.platform_email_approvals (
    approval_id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id character varying(16) NOT NULL,
    status character varying(20) DEFAULT 'pending'::character varying NOT NULL,
    requested_by character varying(64),
    requested_at timestamp with time zone DEFAULT now(),
    reviewed_by character varying(64),
    reviewed_at timestamp with time zone,
    review_note text,
    CONSTRAINT platform_email_approvals_status_check CHECK (((status)::text = ANY ((ARRAY['pending'::character varying, 'approved'::character varying, 'denied'::character varying, 'revoked'::character varying])::text[])))
);


--
-- Name: platform_products; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.platform_products (
    product_key character varying(50) NOT NULL,
    name_en character varying(200) NOT NULL,
    name_ar character varying(200),
    version character varying(20) DEFAULT '1.0.0'::character varying NOT NULL,
    enabled boolean DEFAULT true NOT NULL,
    manifest jsonb DEFAULT '{}'::jsonb NOT NULL,
    registered_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    domains text[] DEFAULT '{}'::text[],
    default_domain character varying(255),
    landing_route character varying(255) DEFAULT '/workspace-home'::character varying
);


--
-- Name: product_modules; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.product_modules (
    product_key character varying(50) NOT NULL,
    module_code character varying(50) NOT NULL,
    module_type character varying(30) NOT NULL,
    display_name_en character varying(200) NOT NULL,
    display_name_ar character varying(200),
    description_en text,
    description_ar text,
    module_category character varying(30) DEFAULT 'core_grc'::character varying NOT NULL,
    is_required boolean DEFAULT false NOT NULL,
    tier_gate character varying(30),
    feature_flag character varying(100),
    default_landing_route text,
    nav_icon character varying(50),
    nav_sort_order integer DEFAULT 0 NOT NULL,
    permission_prefix character varying(50) NOT NULL,
    enabled boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    route_prefix character varying(50),
    category_icon character varying(30),
    category_label_key character varying(50),
    CONSTRAINT product_modules_module_category_check CHECK (((module_category)::text = ANY ((ARRAY['core_grc'::character varying, 'operational'::character varying, 'governance'::character varying, 'advanced'::character varying, 'platform'::character varying, 'intelligence'::character varying])::text[]))),
    CONSTRAINT product_modules_module_type_check CHECK (((module_type)::text = ANY ((ARRAY['flagship'::character varying, 'platform_core'::character varying, 'shared_service'::character varying])::text[])))
);


--
-- Name: provisioning_events; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.provisioning_events (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    job_id uuid NOT NULL,
    step_id uuid,
    event_type character varying(100) NOT NULL,
    level character varying(20) DEFAULT 'info'::character varying NOT NULL,
    message text NOT NULL,
    details_json jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: provisioning_job_lookup; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.provisioning_job_lookup (
    job_id uuid NOT NULL,
    tenant_id character varying(64) NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: provisioning_jobs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.provisioning_jobs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    session_id uuid NOT NULL,
    tenant_id uuid,
    workspace_id uuid,
    job_status character varying(40) DEFAULT 'queued'::character varying NOT NULL,
    started_at timestamp with time zone,
    completed_at timestamp with time zone,
    failed_at timestamp with time zone,
    retry_count integer DEFAULT 0 NOT NULL,
    requested_by_user_id character varying(64) NOT NULL,
    summary_json jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: provisioning_step_definitions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.provisioning_step_definitions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    step_code character varying(50) NOT NULL,
    step_name text NOT NULL,
    step_name_ar text,
    sequence_no integer DEFAULT 0 NOT NULL,
    is_required boolean DEFAULT true NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    can_retry boolean DEFAULT true NOT NULL,
    max_retries integer DEFAULT 3 NOT NULL,
    timeout_seconds integer DEFAULT 300 NOT NULL,
    handler_class character varying(200),
    depends_on text[],
    configuration jsonb,
    error_handling jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: provisioning_steps; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.provisioning_steps (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    job_id uuid NOT NULL,
    step_code character varying(100) NOT NULL,
    step_name character varying(255) NOT NULL,
    sequence_no integer NOT NULL,
    status character varying(40) DEFAULT 'queued'::character varying NOT NULL,
    started_at timestamp with time zone,
    completed_at timestamp with time zone,
    duration_ms integer,
    error_message text,
    payload_json jsonb DEFAULT '{}'::jsonb NOT NULL,
    retry_count integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: questionnaires; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.questionnaires (
    questionnaire_id uuid DEFAULT gen_random_uuid() NOT NULL,
    vendor_id uuid NOT NULL,
    title character varying(500) NOT NULL,
    framework_refs jsonb DEFAULT '[]'::jsonb,
    questions jsonb DEFAULT '[]'::jsonb NOT NULL,
    status character varying(20) DEFAULT 'draft'::character varying NOT NULL,
    responses jsonb,
    evaluation jsonb,
    created_by uuid NOT NULL,
    distributed_at timestamp with time zone,
    due_date timestamp with time zone,
    completed_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: quotes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.quotes (
    quote_id uuid DEFAULT gen_random_uuid() NOT NULL,
    category character varying(50) NOT NULL,
    text_ar text NOT NULL,
    text_en text NOT NULL,
    sort_order integer DEFAULT 0
);


--
-- Name: raci_config; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.raci_config (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id character varying(16) NOT NULL,
    process_name character varying(200) NOT NULL,
    activity_name character varying(200) NOT NULL,
    responsible_role character varying(100),
    accountable_role character varying(100),
    consulted_roles text[],
    informed_roles text[],
    automation_level character varying(50),
    frequency character varying(50),
    documentation_link text,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: rate_limit_hits; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.rate_limit_hits (
    key character varying(255) NOT NULL,
    window_start bigint NOT NULL,
    hit_count integer DEFAULT 1 NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: recent_searches; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.recent_searches (
    search_id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    query character varying(500) NOT NULL,
    searched_at timestamp with time zone DEFAULT now()
);


--
-- Name: regulator_requests; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.regulator_requests (
    request_id uuid DEFAULT gen_random_uuid() NOT NULL,
    regulator_user_id uuid NOT NULL,
    request_type character varying(50) NOT NULL,
    subject character varying(500) NOT NULL,
    body text NOT NULL,
    status character varying(20) DEFAULT 'pending'::character varying NOT NULL,
    response text,
    responded_by uuid,
    responded_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: regulator_sector_enforcement; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.regulator_sector_enforcement (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    regulator_id character varying(50),
    sector_code character varying(50),
    enforcement_type character varying(50),
    enforcement_level character varying(50),
    is_primary_regulator boolean DEFAULT false,
    effective_date date,
    notes text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: regulator_sector_coverage; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.regulator_sector_coverage AS
 SELECT r.regulator_id,
    r.acronym,
    r.name_en,
    count(DISTINCT rse.sector_code) AS sectors_covered,
        CASE
            WHEN (count(DISTINCT rse.sector_code) >= 19) THEN 'All Sectors'::text
            WHEN (count(DISTINCT rse.sector_code) >= 10) THEN 'Multi-Sector'::text
            WHEN (count(DISTINCT rse.sector_code) >= 5) THEN 'Several Sectors'::text
            WHEN (count(DISTINCT rse.sector_code) = 1) THEN 'Single Sector'::text
            ELSE 'Limited Sectors'::text
        END AS coverage_type,
    string_agg((ls.sector_code)::text, ', '::text ORDER BY (ls.sector_code)::text) AS sector_codes,
    count(DISTINCT rse.sector_code) FILTER (WHERE (rse.is_primary_regulator = true)) AS primary_sector_count
   FROM ((public.regulators r
     LEFT JOIN public.regulator_sector_enforcement rse ON (((rse.regulator_id)::text = (r.regulator_id)::text)))
     LEFT JOIN public.lookup_sectors ls ON (((ls.sector_code)::text = (rse.sector_code)::text)))
  WHERE ((r.regulator_id)::text ~~ 'REG-KSA-%'::text)
  GROUP BY r.regulator_id, r.acronym, r.name_en
  ORDER BY (count(DISTINCT rse.sector_code)) DESC;


--
-- Name: regulatory_alerts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.regulatory_alerts (
    alert_id uuid DEFAULT gen_random_uuid() NOT NULL,
    authority_code character varying(20),
    alert_type character varying(30) DEFAULT 'circular'::character varying NOT NULL,
    title character varying(500) NOT NULL,
    description text,
    affected_sectors text[] DEFAULT '{}'::text[],
    effective_date date,
    urgency character varying(20) DEFAULT 'medium'::character varying,
    source_url text,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: regulatory_change_log; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.regulatory_change_log (
    change_id uuid DEFAULT gen_random_uuid() NOT NULL,
    framework_code character varying(50) NOT NULL,
    from_version character varying(20),
    to_version character varying(20) NOT NULL,
    change_type character varying(30) DEFAULT 'amended'::character varying,
    effective_date date DEFAULT CURRENT_DATE NOT NULL,
    transition_deadline date,
    affected_controls jsonb DEFAULT '[]'::jsonb,
    summary text,
    published_by character varying(100),
    source_url text,
    impact_assessed boolean DEFAULT false,
    impact_notes text,
    propagated_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: regulatory_delta_impacts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.regulatory_delta_impacts (
    impact_id uuid DEFAULT gen_random_uuid() NOT NULL,
    delta_id uuid,
    tenant_id character varying(16),
    affected_controls text[] DEFAULT '{}'::text[],
    impact_level character varying(20) NOT NULL,
    notified boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now(),
    status character varying(20) DEFAULT 'pending'::character varying,
    resolved_at timestamp with time zone
);


--
-- Name: regulatory_deltas; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.regulatory_deltas (
    delta_id uuid DEFAULT gen_random_uuid() NOT NULL,
    instrument_id character varying(100) NOT NULL,
    instrument_name character varying(255),
    previous_version character varying(50),
    new_version character varying(50),
    added_nodes text[] DEFAULT '{}'::text[],
    modified_nodes text[] DEFAULT '{}'::text[],
    removed_nodes text[] DEFAULT '{}'::text[],
    detected_at timestamp with time zone DEFAULT now()
);


--
-- Name: report_shares; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.report_shares (
    share_id uuid DEFAULT gen_random_uuid() NOT NULL,
    report_id uuid NOT NULL,
    shared_by uuid NOT NULL,
    recipient_id uuid NOT NULL,
    recipient_type character varying(20) DEFAULT 'user'::character varying NOT NULL,
    shared_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: risk_categories; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.risk_categories (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    risk_code character varying(50) NOT NULL,
    risk_name_en character varying(255) NOT NULL,
    risk_name_ar character varying(255),
    risk_type character varying(50),
    description_en text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: risk_control_mappings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.risk_control_mappings (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    risk_id uuid,
    control_id uuid,
    control_effectiveness character varying(20),
    mitigation_percentage integer,
    is_primary_control boolean DEFAULT false,
    notes text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: risks; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.risks (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    risk_category_id uuid,
    risk_code character varying(100) NOT NULL,
    risk_title_en character varying(500) NOT NULL,
    risk_title_ar character varying(500),
    risk_description_en text,
    risk_impact character varying(20),
    risk_likelihood character varying(20),
    inherent_risk_score integer,
    sector_codes text[],
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: sector_risks; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sector_risks (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    sector_code character varying(50),
    risk_id uuid,
    sector_impact character varying(20),
    sector_likelihood character varying(20),
    regulatory_requirement boolean DEFAULT false,
    priority_rank integer,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    sector_id character varying(50)
);


--
-- Name: risk_control_framework_chain; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.risk_control_framework_chain AS
 SELECT ls.sector_code,
    ls.sector_name_en,
    r.risk_code,
    r.risk_title_en,
    r.risk_impact,
    r.risk_likelihood,
    r.inherent_risk_score,
    rc.control_code,
    rc.control_title_en,
    rc.criticality_level,
    rcm.control_effectiveness,
    rcm.mitigation_percentage,
    rf.framework_code,
    rf.framework_name_en,
    rf.framework_type,
    lra.authority_code AS regulator_code,
    lra.authority_name_en AS regulator_name,
    sr.regulatory_requirement,
    sr.priority_rank AS risk_priority,
    cs.applicability AS control_applicability,
    cs.sector_priority AS control_priority
   FROM (((((((((public.sector_risks sr
     JOIN public.risks r ON ((r.id = sr.risk_id)))
     JOIN public.risk_control_mappings rcm ON ((rcm.risk_id = r.id)))
     JOIN public.regulatory_controls rc ON ((rc.id = rcm.control_id)))
     JOIN public.control_domains cd ON ((cd.id = rc.domain_id)))
     JOIN public.framework_versions fv ON ((fv.id = cd.version_id)))
     JOIN public.regulatory_frameworks rf ON (((rf.framework_code)::text = (fv.framework_code)::text)))
     LEFT JOIN public.lookup_ksa_regulatory_authorities lra ON (((lra.authority_code)::text = (rf.authority_code)::text)))
     JOIN public.control_sectors cs ON (((cs.control_id = rc.id) AND ((cs.sector_code)::text = (sr.sector_code)::text))))
     JOIN public.lookup_sectors ls ON (((ls.sector_code)::text = (sr.sector_code)::text)))
  WHERE ((sr.sector_code)::text = (cs.sector_code)::text);


--
-- Name: risk_criteria; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.risk_criteria (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id character varying(16) NOT NULL,
    criteria_type character varying(50) NOT NULL,
    risk_category character varying(100),
    risk_appetite character varying(50),
    methodology character varying(100),
    impact_scale integer DEFAULT 5,
    likelihood_scale integer DEFAULT 5,
    risk_matrix jsonb,
    scoring_formula text,
    thresholds jsonb DEFAULT '{}'::jsonb,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: risk_pair_reviews; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.risk_pair_reviews (
    review_id uuid DEFAULT gen_random_uuid() NOT NULL,
    risk_id character varying(64) NOT NULL,
    agent_id character varying(64) NOT NULL,
    human_analyst_id character varying(64) NOT NULL,
    agent_score integer DEFAULT 0 NOT NULL,
    agent_reasoning text DEFAULT ''::text NOT NULL,
    human_score integer,
    human_reasoning text,
    final_score integer,
    final_method character varying(20) DEFAULT 'pending'::character varying NOT NULL,
    disagreement_flag boolean DEFAULT false NOT NULL,
    dialogue_entries jsonb DEFAULT '[]'::jsonb NOT NULL,
    status character varying(20) DEFAULT 'agent_assessed'::character varying NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    finalized_at timestamp with time zone
);


--
-- Name: roadmap_tasks; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.roadmap_tasks (
    task_id uuid DEFAULT gen_random_uuid() NOT NULL,
    roadmap_id uuid NOT NULL,
    milestone_id character varying(64) NOT NULL,
    phase_type character varying(32) NOT NULL,
    title_en character varying(512) NOT NULL,
    title_ar character varying(512) NOT NULL,
    target_module character varying(128),
    target_action character varying(128),
    priority character varying(16) DEFAULT 'medium'::character varying NOT NULL,
    status character varying(16) DEFAULT 'pending'::character varying NOT NULL,
    framework_ref character varying(64),
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    owner_user_id character varying(64),
    owner_team_id uuid,
    due_date date,
    progress_pct integer DEFAULT 0,
    notes text
);


--
-- Name: roadmaps; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.roadmaps (
    roadmap_id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id character varying(64) NOT NULL,
    phases jsonb DEFAULT '[]'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: role_function_map; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.role_function_map (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id character varying(16) NOT NULL,
    role_id character varying(100) NOT NULL,
    function_code character varying(100) NOT NULL,
    permission_level character varying(50),
    is_responsible boolean DEFAULT false,
    is_accountable boolean DEFAULT false,
    is_consulted boolean DEFAULT false,
    is_informed boolean DEFAULT false,
    can_delegate boolean DEFAULT false,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: role_functions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.role_functions (
    function_code character varying(100) NOT NULL,
    module_code character varying(50) NOT NULL,
    name_en character varying(255) NOT NULL,
    name_ar character varying(255),
    description_en text,
    description_ar text,
    function_category character varying(20) DEFAULT 'business'::character varying NOT NULL,
    active boolean DEFAULT true NOT NULL,
    is_system boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT role_functions_function_category_check CHECK (((function_category)::text = ANY ((ARRAY['business'::character varying, 'workflow'::character varying, 'admin'::character varying, 'reporting'::character varying, 'integration'::character varying])::text[])))
);


--
-- Name: roles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.roles (
    role_id character varying(50) NOT NULL,
    tenant_id character varying(16),
    name_en character varying(100) NOT NULL,
    name_ar character varying(100) NOT NULL,
    description_en text,
    description_ar text,
    permissions text[] DEFAULT '{}'::text[],
    is_system boolean DEFAULT true,
    can_approve boolean DEFAULT false,
    max_risk_level character varying(20) DEFAULT 'low'::character varying,
    sort_order integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

ALTER TABLE ONLY public.roles FORCE ROW LEVEL SECURITY;


--
-- Name: saved_searches; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.saved_searches (
    search_id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    name character varying(255) NOT NULL,
    query character varying(500) NOT NULL,
    filters jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: scan_schedules; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.scan_schedules (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id character varying(16) NOT NULL,
    scan_type character varying(100) NOT NULL,
    scan_name character varying(200) NOT NULL,
    target_systems text[],
    scan_tool character varying(100),
    frequency character varying(50),
    cron_expression character varying(100),
    last_run_date timestamp with time zone,
    next_run_date timestamp with time zone,
    last_findings_count integer,
    severity_distribution jsonb,
    notification_list text[],
    auto_ticket_creation boolean DEFAULT false,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: schema_migrations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.schema_migrations (
    version integer NOT NULL,
    filename text NOT NULL,
    checksum text NOT NULL,
    applied_at timestamp with time zone DEFAULT now()
);


--
-- Name: score_calibrations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.score_calibrations (
    calibration_id uuid DEFAULT gen_random_uuid() NOT NULL,
    vendor_id character varying(64) NOT NULL,
    agent_id character varying(64) DEFAULT 'AGENT-A06'::character varying NOT NULL,
    agent_rationale text DEFAULT ''::text NOT NULL,
    original_weights jsonb DEFAULT '{}'::jsonb NOT NULL,
    calibrated_weights jsonb,
    overrides jsonb DEFAULT '[]'::jsonb NOT NULL,
    calibrated_by character varying(64),
    status character varying(20) DEFAULT 'proposed'::character varying NOT NULL,
    quarter_label character varying(10) NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: search_index_config; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.search_index_config (
    config_id uuid DEFAULT gen_random_uuid() NOT NULL,
    entity_type character varying(50) NOT NULL,
    weight_title numeric(3,2) DEFAULT 2.00 NOT NULL,
    weight_description numeric(3,2) DEFAULT 1.00 NOT NULL,
    boost_recent_days integer DEFAULT 30 NOT NULL,
    boost_factor numeric(3,2) DEFAULT 1.50 NOT NULL,
    enabled boolean DEFAULT true,
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: sector_code_mapping; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sector_code_mapping (
    old_code character varying(50),
    new_isic4_code character varying(1),
    description text
);


--
-- Name: sector_framework; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sector_framework (
    sector_id character varying(50) NOT NULL,
    framework_code character varying(50) NOT NULL,
    applicability character varying(30) DEFAULT 'mandatory'::character varying NOT NULL,
    source character varying(50) DEFAULT 'array_migration'::character varying,
    effective_from date DEFAULT CURRENT_DATE,
    effective_to date,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: sector_isic_map; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sector_isic_map (
    sector_id character varying(50) NOT NULL,
    isic_code character(1) NOT NULL,
    weight numeric(3,2) DEFAULT 1.00,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: sector_regulator; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sector_regulator (
    sector_id character varying(50) NOT NULL,
    regulator_id character varying(50) NOT NULL,
    applicability character varying(30) DEFAULT 'mandatory'::character varying NOT NULL,
    reason_code character varying(50),
    notes text,
    effective_from date DEFAULT CURRENT_DATE,
    effective_to date,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: seed_history; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.seed_history (
    seed_id character varying(100) NOT NULL,
    version character varying(50) NOT NULL,
    executed_at timestamp with time zone DEFAULT now(),
    status character varying(20) DEFAULT 'success'::character varying
);


--
-- Name: seeding_depth_config; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.seeding_depth_config (
    config_id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id character varying(64) NOT NULL,
    maturity_tier character varying(16) DEFAULT 'medium'::character varying NOT NULL,
    seeding_profile jsonb DEFAULT '{}'::jsonb NOT NULL,
    applied_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: sop_procedures; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sop_procedures (
    sop_id uuid DEFAULT gen_random_uuid() NOT NULL,
    process_type character varying(50) NOT NULL,
    stage_id character varying(50) NOT NULL,
    role_id character varying(50) NOT NULL,
    title_en character varying(300) NOT NULL,
    title_ar character varying(300) NOT NULL,
    steps_en jsonb DEFAULT '[]'::jsonb NOT NULL,
    steps_ar jsonb DEFAULT '[]'::jsonb NOT NULL,
    prerequisites text,
    expected_output text,
    sla_hours integer,
    version integer DEFAULT 1,
    status character varying(20) DEFAULT 'active'::character varying,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: standup_digests; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.standup_digests (
    digest_id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id character varying(64) NOT NULL,
    entries jsonb DEFAULT '[]'::jsonb NOT NULL,
    team_lead_priorities jsonb,
    status character varying(20) DEFAULT 'generated'::character varying NOT NULL,
    generated_at timestamp with time zone DEFAULT now(),
    acknowledged_at timestamp with time zone,
    acknowledged_by character varying(64)
);


--
-- Name: startup_checklists; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.startup_checklists (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    session_id uuid NOT NULL,
    tenant_id uuid,
    workspace_id uuid,
    item_code text NOT NULL,
    title_en text NOT NULL,
    title_ar text NOT NULL,
    description_en text,
    description_ar text,
    category text DEFAULT 'setup'::text NOT NULL,
    sort_order integer DEFAULT 0 NOT NULL,
    is_completed boolean DEFAULT false NOT NULL,
    completed_at timestamp with time zone,
    completed_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: subscription_audit_log; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.subscription_audit_log (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id text NOT NULL,
    subscription_id uuid,
    action character varying(100) NOT NULL,
    old_status character varying(50),
    new_status character varying(50),
    old_tier character varying(50),
    new_tier character varying(50),
    old_period_end timestamp with time zone,
    new_period_end timestamp with time zone,
    billing_cycle character varying(20),
    gateway character varying(20),
    amount numeric(12,2),
    currency character varying(10),
    extension_days integer,
    old_state jsonb,
    new_state jsonb,
    performed_by text,
    reason text,
    source character varying(30) DEFAULT 'system'::character varying,
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: subscription_change_log; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.subscription_change_log (
    change_id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id character varying(64) NOT NULL,
    changed_by character varying(255) NOT NULL,
    change_type character varying(30) NOT NULL,
    before_state jsonb DEFAULT '{}'::jsonb NOT NULL,
    after_state jsonb DEFAULT '{}'::jsonb NOT NULL,
    reason text,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT subscription_change_log_change_type_check CHECK (((change_type)::text = ANY ((ARRAY['module_added'::character varying, 'module_removed'::character varying, 'tier_changed'::character varying, 'edition_changed'::character varying])::text[])))
);


--
-- Name: subscription_change_requests; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.subscription_change_requests (
    request_id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id text NOT NULL,
    subscription_id uuid,
    request_type character varying(30) NOT NULL,
    target_tier character varying(50),
    effective_mode character varying(20) DEFAULT 'immediate'::character varying,
    reason text,
    status character varying(20) DEFAULT 'pending'::character varying,
    requested_by text NOT NULL,
    approved_by text,
    approved_at timestamp with time zone,
    effective_at timestamp with time zone,
    metadata jsonb DEFAULT '{}'::jsonb,
    decision_notes text,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: subscription_extensions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.subscription_extensions (
    extension_id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id text NOT NULL,
    subscription_id uuid,
    extension_type character varying(30) DEFAULT 'admin'::character varying NOT NULL,
    extension_days integer NOT NULL,
    reason text NOT NULL,
    status character varying(20) DEFAULT 'pending'::character varying,
    requested_by text NOT NULL,
    approved_by text,
    approved_at timestamp with time zone,
    applied_at timestamp with time zone,
    decision_notes text,
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: subscription_notifications_log; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.subscription_notifications_log (
    notification_id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id text NOT NULL,
    subscription_id uuid,
    event_type character varying(50) NOT NULL,
    channel character varying(20) DEFAULT 'both'::character varying NOT NULL,
    recipient text,
    status character varying(20) DEFAULT 'sent'::character varying,
    metadata jsonb DEFAULT '{}'::jsonb,
    sent_at timestamp with time zone DEFAULT now()
);


--
-- Name: subscriptions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.subscriptions (
    subscription_id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id character varying(100) NOT NULL,
    tier character varying(20) DEFAULT 'starter'::character varying NOT NULL,
    billing_cycle character varying(10) DEFAULT 'monthly'::character varying NOT NULL,
    gateway character varying(20) DEFAULT 'stripe'::character varying NOT NULL,
    external_subscription_id character varying(255),
    stripe_customer_id character varying(255),
    status character varying(30) DEFAULT 'trialing'::character varying NOT NULL,
    trial_ends_at timestamp with time zone,
    current_period_start timestamp with time zone,
    current_period_end timestamp with time zone,
    cancelled_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    grc_enabled boolean DEFAULT true NOT NULL,
    qiyas_enabled boolean DEFAULT false NOT NULL,
    licensed_modules text[] DEFAULT '{grc}'::text[] NOT NULL,
    grace_ends_at timestamp with time zone,
    renewal_mode character varying(20) DEFAULT 'auto'::character varying,
    subscription_mode character varying(30) DEFAULT 'preview'::character varying,
    pause_starts_at timestamp with time zone,
    pause_ends_at timestamp with time zone,
    downgrade_scheduled_tier character varying(50),
    downgrade_scheduled_at timestamp with time zone,
    auto_renew boolean DEFAULT true,
    renewal_retry_count integer DEFAULT 0,
    last_renewal_attempt_at timestamp with time zone,
    contract_reference text,
    reseller_id text,
    read_only_after_expiry boolean DEFAULT true,
    service_continuity_override_until timestamp with time zone,
    last_notification_at timestamp with time zone,
    last_status_reason text,
    metadata jsonb DEFAULT '{}'::jsonb
);


--
-- Name: table_system_flags; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.table_system_flags (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    schema_name character varying(100) DEFAULT 'public'::character varying NOT NULL,
    table_name character varying(100) NOT NULL,
    system_category character varying(50) NOT NULL,
    module_name character varying(100),
    description text,
    is_multi_tenant boolean DEFAULT false,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT table_system_flags_system_category_check CHECK (((system_category)::text = ANY ((ARRAY['Platform'::character varying, 'GRC'::character varying, 'Qiya'::character varying])::text[])))
);


--
-- Name: team_members; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.team_members (
    team_member_id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    team_id uuid NOT NULL,
    user_id character varying(64) NOT NULL,
    team_role character varying(20) DEFAULT 'member'::character varying NOT NULL,
    joined_at timestamp with time zone DEFAULT now() NOT NULL,
    left_at timestamp with time zone,
    active boolean DEFAULT true NOT NULL,
    CONSTRAINT team_members_team_role_check CHECK (((team_role)::text = ANY ((ARRAY['lead'::character varying, 'member'::character varying, 'reviewer'::character varying, 'approver'::character varying, 'observer'::character varying])::text[])))
);


--
-- Name: team_recommendations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.team_recommendations (
    recommendation_id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id character varying(64) NOT NULL,
    company_size character varying(16) NOT NULL,
    recommended_teams jsonb DEFAULT '[]'::jsonb NOT NULL,
    raci_matrix jsonb DEFAULT '[]'::jsonb NOT NULL,
    applied boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: teams; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.teams (
    team_id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    team_code character varying(50) NOT NULL,
    name_en character varying(200) NOT NULL,
    name_ar character varying(200),
    description_en text,
    description_ar text,
    team_lead_user_id character varying(64),
    parent_team_id uuid,
    team_type character varying(20) DEFAULT 'operational'::character varying NOT NULL,
    active boolean DEFAULT true NOT NULL,
    metadata jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT teams_team_type_check CHECK (((team_type)::text = ANY ((ARRAY['executive'::character varying, 'operational'::character varying, 'project'::character varying, 'virtual'::character varying, 'committee'::character varying])::text[])))
);


--
-- Name: telemetry_signals; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.telemetry_signals (
    signal_id uuid DEFAULT gen_random_uuid() NOT NULL,
    subject_key character varying(200) NOT NULL,
    signal_type character varying(50) NOT NULL,
    severity character varying(20) NOT NULL,
    source character varying(100) NOT NULL,
    payload jsonb DEFAULT '{}'::jsonb,
    occurred_at timestamp with time zone NOT NULL,
    ingested_at timestamp with time zone DEFAULT now()
);


--
-- Name: tenant_blueprints; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.tenant_blueprints (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id character varying(64) NOT NULL,
    version integer DEFAULT 1 NOT NULL,
    blueprint jsonb NOT NULL,
    checksum character varying(64) NOT NULL,
    source character varying(30) DEFAULT 'onboarding'::character varying NOT NULL,
    status character varying(30) DEFAULT 'active'::character varying NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    created_by character varying(64) NOT NULL,
    superseded_at timestamp with time zone
);


--
-- Name: tenant_module_entitlements; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.tenant_module_entitlements (
    entitlement_id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id text NOT NULL,
    grc_enabled boolean DEFAULT true NOT NULL,
    qiyas_enabled boolean DEFAULT false NOT NULL,
    licensed_modules text[] DEFAULT '{grc}'::text[] NOT NULL,
    default_operation_mode character varying(30) DEFAULT 'human_only'::character varying NOT NULL,
    agent_confidence_threshold numeric(3,2) DEFAULT 0.85 NOT NULL,
    workflow_mode_enforcement character varying(20) DEFAULT 'per_step'::character varying NOT NULL,
    modules_config jsonb DEFAULT '{}'::jsonb NOT NULL,
    activated_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT tenant_module_entitlements_default_operation_mode_check CHECK (((default_operation_mode)::text = ANY ((ARRAY['human_only'::character varying, 'hybrid_shadow'::character varying, 'hybrid_active'::character varying, 'autonomous'::character varying])::text[]))),
    CONSTRAINT tenant_module_entitlements_workflow_mode_enforcement_check CHECK (((workflow_mode_enforcement)::text = ANY ((ARRAY['tenant_wide'::character varying, 'per_team'::character varying, 'per_step'::character varying])::text[])))
);


--
-- Name: tenant_regulatory_impacts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.tenant_regulatory_impacts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    change_id uuid NOT NULL,
    tenant_id uuid NOT NULL,
    framework_code character varying(50) NOT NULL,
    affected_control_count integer DEFAULT 0,
    status character varying(30) DEFAULT 'pending'::character varying,
    acknowledged_by uuid,
    acknowledged_at timestamp with time zone,
    resolved_at timestamp with time zone,
    notes text,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: tenant_regulatory_profile; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.tenant_regulatory_profile (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id character varying(16) NOT NULL,
    primary_regulator character varying(200),
    license_number character varying(100),
    regulated_sector boolean DEFAULT false,
    sector_classification character varying(100),
    required_frameworks text[],
    reporting_obligations jsonb DEFAULT '[]'::jsonb,
    audit_frequency character varying(50),
    last_regulatory_review date,
    next_regulatory_review date,
    compliance_officer_email character varying(255),
    privacy_officer_email character varying(255),
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: tenant_sectors; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.tenant_sectors (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    sector_code character varying(50) NOT NULL,
    is_primary boolean DEFAULT false,
    added_at timestamp with time zone DEFAULT now(),
    added_by uuid
);


--
-- Name: tenant_settings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.tenant_settings (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id character varying(16) NOT NULL,
    setting_category character varying(100) NOT NULL,
    setting_key character varying(200) NOT NULL,
    setting_value jsonb NOT NULL,
    setting_type character varying(50),
    is_encrypted boolean DEFAULT false,
    description text,
    is_user_configurable boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    updated_by character varying(255)
);


--
-- Name: tenant_sso_config; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.tenant_sso_config (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id character varying(16) NOT NULL,
    provider_type character varying(50) NOT NULL,
    provider_name character varying(100) NOT NULL,
    idp_url text,
    client_id character varying(200),
    client_secret text,
    certificate text,
    metadata_url text,
    attribute_mapping jsonb DEFAULT '{}'::jsonb,
    group_mapping jsonb DEFAULT '{}'::jsonb,
    auto_provision_users boolean DEFAULT false,
    default_role character varying(100),
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: tenant_usage_snapshots; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.tenant_usage_snapshots (
    snapshot_id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id text NOT NULL,
    users_count integer DEFAULT 0,
    frameworks_count integer DEFAULT 0,
    active_modules_count integer DEFAULT 0,
    storage_bytes bigint DEFAULT 0,
    ai_requests_count integer DEFAULT 0,
    evidence_count integer DEFAULT 0,
    metadata jsonb DEFAULT '{}'::jsonb,
    taken_at timestamp with time zone DEFAULT now()
);


--
-- Name: tenant_user_memberships; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.tenant_user_memberships (
    membership_id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id character varying(16) NOT NULL,
    user_id character varying(64) NOT NULL,
    membership_type text DEFAULT 'internal'::text NOT NULL,
    is_tenant_owner boolean DEFAULT false NOT NULL,
    status text DEFAULT 'active'::text NOT NULL,
    joined_at timestamp with time zone DEFAULT now() NOT NULL,
    left_at timestamp with time zone,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    authz_version integer DEFAULT 1 NOT NULL,
    org_role_code character varying(50),
    CONSTRAINT tenant_user_memberships_membership_type_check CHECK ((membership_type = ANY (ARRAY['internal'::text, 'consultant'::text, 'vendor'::text, 'regulator'::text, 'auditor'::text, 'partner'::text]))),
    CONSTRAINT tenant_user_memberships_status_check CHECK ((status = ANY (ARRAY['active'::text, 'inactive'::text, 'pending'::text, 'revoked'::text])))
);


--
-- Name: tenants; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.tenants (
    tenant_id character varying(16) NOT NULL,
    org_name character varying(255) NOT NULL,
    industry character varying(100) DEFAULT 'other'::character varying NOT NULL,
    org_size character varying(50) DEFAULT '1-50'::character varying NOT NULL,
    regions text[] DEFAULT '{}'::text[],
    plan character varying(50) DEFAULT 'free'::character varying,
    status character varying(50) DEFAULT 'onboarding'::character varying NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    logo_url character varying(500),
    primary_color character varying(7) DEFAULT '#1a73e8'::character varying,
    custom_domain character varying(255),
    active_frameworks text[] DEFAULT '{}'::text[],
    compliance_score integer DEFAULT 0,
    settings jsonb DEFAULT '{}'::jsonb,
    org_name_ar character varying(255),
    org_type character varying(50) DEFAULT 'private'::character varying,
    legal_form character varying(50),
    cr_number character varying(30),
    unified_number character varying(30),
    vat_number character varying(30),
    listing_status character varying(30) DEFAULT 'private'::character varying,
    parent_tenant_id character varying(16),
    country_of_incorporation character varying(3) DEFAULT 'SAU'::character varying,
    headquarter_city character varying(100),
    economic_zone character varying(50),
    branch_count integer DEFAULT 1,
    operating_regions text[] DEFAULT '{SAU}'::text[],
    cross_border_ops boolean DEFAULT false,
    cross_border_countries text[] DEFAULT '{}'::text[],
    sector_ids text[] DEFAULT '{}'::text[],
    primary_sector_id character varying(50),
    isic_code character varying(10),
    critical_infrastructure boolean DEFAULT false,
    critical_sector_designation character varying(50),
    employee_count integer,
    annual_revenue_range character varying(30),
    fiscal_year_end character varying(5) DEFAULT '12-31'::character varying,
    it_staff_count integer DEFAULT 0,
    security_staff_count integer DEFAULT 0,
    has_ciso boolean DEFAULT false,
    has_dpo boolean DEFAULT false,
    data_classification_level character varying(30) DEFAULT 'internal'::character varying,
    processes_personal_data boolean DEFAULT true,
    personal_data_volume character varying(20) DEFAULT 'medium'::character varying,
    cross_border_data_transfer boolean DEFAULT false,
    cloud_providers text[] DEFAULT '{}'::text[],
    uses_ai_ml boolean DEFAULT false,
    processes_payment_cards boolean DEFAULT false,
    has_ot_scada boolean DEFAULT false,
    has_iot_devices boolean DEFAULT false,
    grc_maturity_level character varying(30) DEFAULT 'initial'::character varying,
    existing_certifications text[] DEFAULT '{}'::text[],
    target_certifications text[] DEFAULT '{}'::text[],
    last_audit_date date,
    next_audit_date date,
    regulator_ids text[] DEFAULT '{}'::text[],
    has_board_committee boolean DEFAULT false,
    has_risk_committee boolean DEFAULT false,
    has_audit_committee boolean DEFAULT false,
    reporting_currency character varying(3) DEFAULT 'SAR'::character varying,
    language_primary character varying(2) DEFAULT 'ar'::character varying,
    language_secondary character varying(2) DEFAULT 'en'::character varying,
    timezone character varying(50) DEFAULT 'Asia/Riyadh'::character varying,
    tenant_code text NOT NULL,
    tenant_name_en text NOT NULL,
    tenant_name_ar text,
    schema_name text NOT NULL,
    product_key character varying(50) DEFAULT 'agrc'::character varying,
    isolation_mode character varying(20) DEFAULT 'schema'::character varying,
    db_host character varying(255),
    db_port integer,
    db_name character varying(100),
    db_user character varying(100),
    db_password_ref character varying(255),
    db_ssl_mode character varying(20) DEFAULT 'prefer'::character varying,
    db_pool_max integer DEFAULT 5,
    deployment_mode character varying(20) DEFAULT 'saas_shared'::character varying,
    CONSTRAINT chk_tenants_status CHECK (((status)::text = ANY ((ARRAY['active'::character varying, 'inactive'::character varying, 'suspended'::character varying, 'archived'::character varying])::text[]))),
    CONSTRAINT tenants_deployment_mode_check CHECK (((deployment_mode)::text = ANY ((ARRAY['saas_shared'::character varying, 'saas_dedicated'::character varying, 'on_prem'::character varying])::text[]))),
    CONSTRAINT tenants_isolation_mode_check CHECK (((isolation_mode)::text = ANY ((ARRAY['schema'::character varying, 'database'::character varying])::text[])))
);


--
-- Name: tier_definitions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.tier_definitions (
    tier character varying(20) NOT NULL,
    features text[] NOT NULL,
    limits jsonb NOT NULL,
    timeline character varying(20)
);


--
-- Name: training_schedules; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.training_schedules (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id character varying(16) NOT NULL,
    training_name character varying(200) NOT NULL,
    training_type character varying(50),
    description text,
    target_audience text[],
    delivery_method character varying(50),
    duration_hours numeric(5,2),
    frequency character varying(50),
    last_conducted date,
    next_scheduled date,
    completion_rate numeric(5,2),
    passing_score integer,
    certificate_required boolean DEFAULT false,
    compliance_frameworks text[],
    training_provider character varying(200),
    is_mandatory boolean DEFAULT false,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: triage_proposals; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.triage_proposals (
    proposal_id uuid DEFAULT gen_random_uuid() NOT NULL,
    task_id character varying(64) NOT NULL,
    task_title text NOT NULL,
    proposed_assignee_id character varying(64) NOT NULL,
    proposed_assignee_name text DEFAULT ''::text NOT NULL,
    agent_id character varying(64) NOT NULL,
    reasoning text DEFAULT ''::text NOT NULL,
    confidence_score integer DEFAULT 0 NOT NULL,
    workload_score integer DEFAULT 0 NOT NULL,
    skill_match_score integer DEFAULT 0 NOT NULL,
    status character varying(20) DEFAULT 'pending'::character varying NOT NULL,
    resolved_by character varying(64),
    resolved_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: trial_extension_requests; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.trial_extension_requests (
    request_id uuid DEFAULT gen_random_uuid() NOT NULL,
    subscription_id uuid NOT NULL,
    tenant_id text NOT NULL,
    requested_by_user_id text NOT NULL,
    requested_days integer DEFAULT 7 NOT NULL,
    reason text NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    reviewed_by_user_id text,
    reviewed_at timestamp with time zone,
    decision_notes text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: usage_snapshots; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.usage_snapshots (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id text NOT NULL,
    tier character varying(50) NOT NULL,
    users_count integer DEFAULT 0 NOT NULL,
    frameworks_count integer DEFAULT 0 NOT NULL,
    controls_count integer DEFAULT 0 NOT NULL,
    risks_count integer DEFAULT 0 NOT NULL,
    storage_mb numeric(10,2) DEFAULT 0 NOT NULL,
    snapshot_date date DEFAULT CURRENT_DATE NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: user_activities; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_activities (
    activity_id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id character varying(64),
    tenant_id character varying(16),
    action character varying(50) NOT NULL,
    module character varying(50),
    entity_type character varying(50),
    entity_id character varying(100),
    description text,
    ip_address inet,
    created_at timestamp with time zone DEFAULT now()
);

ALTER TABLE ONLY public.user_activities FORCE ROW LEVEL SECURITY;


--
-- Name: user_favorites; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_favorites (
    favorite_id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    item_type character varying(50) NOT NULL,
    item_id character varying(255) NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: user_function_overrides; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_function_overrides (
    override_id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    user_id character varying(64) NOT NULL,
    function_code character varying(100) NOT NULL,
    action character varying(64) NOT NULL,
    resource_type character varying(64) NOT NULL,
    allow boolean NOT NULL,
    scope_type character varying(32),
    scope_id uuid,
    reason text,
    expires_at timestamp with time zone,
    created_by character varying(64),
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    active boolean DEFAULT true NOT NULL,
    CONSTRAINT user_function_overrides_scope_type_check CHECK (((scope_type)::text = ANY ((ARRAY['workspace'::character varying, 'department'::character varying, 'business_unit'::character varying, 'project'::character varying, 'process'::character varying, 'asset'::character varying, 'vendor'::character varying])::text[])))
);


--
-- Name: user_mfa; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_mfa (
    user_id character varying(64) NOT NULL,
    mfa_type character varying(20) NOT NULL,
    totp_secret character varying(255),
    email_code_hash character varying(255),
    email_code_expires_at timestamp with time zone,
    consecutive_failures integer DEFAULT 0,
    locked_until timestamp with time zone,
    enabled boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: user_preferences; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_preferences (
    preference_id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    user_id character varying(64) NOT NULL,
    sidebar_collapsed boolean DEFAULT false NOT NULL,
    theme character varying(20) DEFAULT 'system'::character varying NOT NULL,
    language character varying(10) DEFAULT 'en'::character varying NOT NULL,
    date_format character varying(20) DEFAULT 'YYYY-MM-DD'::character varying,
    time_format character varying(20) DEFAULT '24h'::character varying,
    pinned_entities jsonb DEFAULT '[]'::jsonb NOT NULL,
    dashboard_layout jsonb DEFAULT '{}'::jsonb NOT NULL,
    search_history jsonb DEFAULT '[]'::jsonb NOT NULL,
    notification_settings jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT user_preferences_theme_check CHECK (((theme)::text = ANY ((ARRAY['light'::character varying, 'dark'::character varying, 'system'::character varying, 'high_contrast'::character varying])::text[])))
);


--
-- Name: users; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.users (
    user_id character varying(64) NOT NULL,
    email character varying(255) NOT NULL,
    password_hash character varying(255) NOT NULL,
    name character varying(255) NOT NULL,
    tenant_id character varying(16),
    role character varying(50) DEFAULT 'owner'::character varying,
    onboarding_complete boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    language character varying(2) DEFAULT 'ar'::character varying,
    notification_prefs jsonb DEFAULT '{}'::jsonb,
    dashboard_role character varying(50) DEFAULT 'viewer'::character varying,
    is_super_admin boolean DEFAULT false,
    role_profile character varying(50),
    user_type character varying(20) DEFAULT 'human'::character varying,
    agent_id character varying(10),
    absence_status character varying(20) DEFAULT 'available'::character varying,
    absent_from timestamp with time zone,
    absent_until timestamp with time zone,
    status text DEFAULT 'active'::text NOT NULL,
    full_name text NOT NULL,
    department_id uuid,
    last_login_at timestamp with time zone,
    manager_user_id character varying(64),
    is_dpo boolean DEFAULT false,
    is_ciso boolean DEFAULT false,
    nationality character varying(3),
    certifications text[],
    qualification_notes text,
    employment_type character varying(30) DEFAULT 'full_time'::character varying,
    job_title character varying(255),
    reports_to character varying(64),
    platform_role character varying(20) DEFAULT 'member'::character varying NOT NULL,
    CONSTRAINT chk_users_status CHECK ((status = ANY (ARRAY['active'::text, 'inactive'::text, 'suspended'::text, 'invited'::text]))),
    CONSTRAINT chk_users_status_v2 CHECK ((status = ANY (ARRAY['active'::text, 'inactive'::text, 'suspended'::text, 'invited'::text]))),
    CONSTRAINT users_status_check CHECK ((status = ANY (ARRAY['active'::text, 'inactive'::text, 'suspended'::text, 'invited'::text])))
);

ALTER TABLE ONLY public.users FORCE ROW LEVEL SECURITY;


--
-- Name: v_active_tenant_memberships; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.v_active_tenant_memberships AS
 SELECT tum.membership_id,
    tum.tenant_id,
    t.tenant_code,
    t.tenant_name_en,
    t.schema_name,
    tum.user_id,
    u.email,
    u.full_name,
    tum.membership_type,
    tum.is_tenant_owner,
    tum.joined_at
   FROM ((public.tenant_user_memberships tum
     JOIN public.users u ON (((u.user_id)::text = (tum.user_id)::text)))
     JOIN public.tenants t ON (((t.tenant_id)::text = (tum.tenant_id)::text)))
  WHERE ((tum.status = 'active'::text) AND (u.status = 'active'::text) AND ((t.status)::text = 'active'::text));


--
-- Name: v_grc_statistics; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.v_grc_statistics AS
 SELECT ( SELECT count(*) AS count
           FROM public.lookup_ksa_regulatory_authorities) AS total_regulators,
    ( SELECT count(*) AS count
           FROM public.regulatory_frameworks) AS total_frameworks,
    ( SELECT count(*) AS count
           FROM public.framework_versions) AS total_versions,
    ( SELECT count(*) AS count
           FROM public.control_domains) AS total_domains,
    ( SELECT count(*) AS count
           FROM public.regulatory_controls) AS total_controls,
    ( SELECT count(*) AS count
           FROM public.control_requirements) AS total_requirements,
    ( SELECT count(*) AS count
           FROM public.evidence_requirements) AS total_evidence_types,
    ( SELECT count(*) AS count
           FROM public.compliance_risks) AS total_risks;


--
-- Name: v_onboarding_dashboard; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.v_onboarding_dashboard AS
 SELECT os.id AS session_id,
    os.session_key,
    os.status,
    os.organization_name,
    os.display_name,
    os.progress_percent,
    os.readiness_score,
    os.blockers_count,
    os.current_stage_code,
    os.started_at,
    os.completed_at,
    u.full_name AS started_by_name,
    u.email AS started_by_email,
    t.tenant_name_en AS tenant_name,
    count(DISTINCT oa.id) AS answers_count,
    count(DISTINCT ob.id) AS active_blockers,
    count(DISTINCT ore.id) AS recommendations_count
   FROM (((((public.onboarding_sessions os
     LEFT JOIN public.users u ON (((u.user_id)::text = (os.started_by_user_id)::text)))
     LEFT JOIN public.tenants t ON (((t.tenant_id)::text = (os.tenant_id)::text)))
     LEFT JOIN public.onboarding_answers oa ON ((oa.session_id = os.id)))
     LEFT JOIN public.onboarding_blockers ob ON (((ob.session_id = os.id) AND (NOT ob.is_resolved))))
     LEFT JOIN public.onboarding_recommendations ore ON ((ore.session_id = os.id)))
  GROUP BY os.id, os.session_key, os.status, os.organization_name, os.display_name, os.progress_percent, os.readiness_score, os.blockers_count, os.current_stage_code, os.started_at, os.completed_at, u.full_name, u.email, t.tenant_name_en;


--
-- Name: v_onboarding_progress; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.v_onboarding_progress AS
 SELECT os.id AS session_id,
    os.session_key,
    ost.stage_code,
    ost.display_order,
    ost.status AS stage_status,
    ost.percent_complete AS stage_progress,
    count(DISTINCT osec.id) AS sections_count,
    count(DISTINCT
        CASE
            WHEN ((osec.status)::text = 'completed'::text) THEN osec.id
            ELSE NULL::uuid
        END) AS sections_completed
   FROM ((public.onboarding_sessions os
     JOIN public.onboarding_stages ost ON ((ost.session_id = os.id)))
     LEFT JOIN public.onboarding_sections osec ON (((osec.session_id = os.id) AND ((osec.stage_code)::text = (ost.stage_code)::text))))
  GROUP BY os.id, os.session_key, ost.stage_code, ost.display_order, ost.status, ost.percent_complete;


--
-- Name: v_onboarding_questions_full; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.v_onboarding_questions_full AS
SELECT
    NULL::uuid AS id,
    NULL::character varying(100) AS question_code,
    NULL::character varying(100) AS stage_code,
    NULL::character varying(255) AS stage_name_en,
    NULL::character varying(255) AS stage_name_ar,
    NULL::character varying(100) AS question_type,
    NULL::character varying(100) AS ui_component,
    NULL::text AS question_text_en,
    NULL::text AS question_text_ar,
    NULL::text AS help_text_en,
    NULL::text AS help_text_ar,
    NULL::boolean AS is_required,
    NULL::integer AS display_order,
    NULL::character varying(100) AS display_group,
    NULL::character varying(100) AS lookup_table,
    NULL::jsonb AS validation_rules,
    NULL::boolean AS impacts_provisioning,
    NULL::boolean AS impacts_compliance,
    NULL::bigint AS guidance_count,
    NULL::bigint AS options_count;


--
-- Name: v_provisioning_status; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.v_provisioning_status AS
 SELECT pj.id AS job_id,
    pj.session_id,
    pj.tenant_id,
    pj.workspace_id,
    pj.job_status,
    pj.started_at,
    pj.completed_at,
    pj.retry_count,
    count(DISTINCT ps.id) AS total_steps,
    count(DISTINCT
        CASE
            WHEN ((ps.status)::text = 'completed'::text) THEN ps.id
            ELSE NULL::uuid
        END) AS completed_steps,
    count(DISTINCT
        CASE
            WHEN ((ps.status)::text = 'failed'::text) THEN ps.id
            ELSE NULL::uuid
        END) AS failed_steps
   FROM (public.provisioning_jobs pj
     LEFT JOIN public.provisioning_steps ps ON ((ps.job_id = pj.id)))
  GROUP BY pj.id, pj.session_id, pj.tenant_id, pj.workspace_id, pj.job_status, pj.started_at, pj.completed_at, pj.retry_count;


--
-- Name: v_sector_frameworks; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.v_sector_frameworks AS
 SELECT sf.sector_id,
    s.name_en AS sector_name_en,
    s.name_ar AS sector_name_ar,
    s.country_code,
    sf.framework_code,
    lf.framework_name,
    lf.framework_acronym,
    lf.regulatory_body,
    sf.applicability,
    sf.source,
    sf.effective_from,
    sf.effective_to,
    COALESCE(a.alias_code, sf.framework_code) AS legacy_alias
   FROM (((public.sector_framework sf
     JOIN public.sectors s ON (((s.sector_id)::text = (sf.sector_id)::text)))
     JOIN public.lookup_frameworks lf ON (((lf.framework_code)::text = (sf.framework_code)::text)))
     LEFT JOIN public.framework_alias a ON (((a.framework_code)::text = (sf.framework_code)::text)))
  WHERE ((sf.effective_to IS NULL) OR (sf.effective_to > CURRENT_DATE));


--
-- Name: v_sector_regulators; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.v_sector_regulators AS
 SELECT sr.sector_id,
    s.name_en AS sector_name_en,
    s.name_ar AS sector_name_ar,
    s.country_code,
    sr.regulator_id,
    r.name_en AS regulator_name_en,
    r.name_ar AS regulator_name_ar,
    r.acronym AS regulator_acronym,
    sr.applicability,
    sr.reason_code,
    sr.effective_from,
    sr.effective_to
   FROM ((public.sector_regulator sr
     JOIN public.sectors s ON (((s.sector_id)::text = (sr.sector_id)::text)))
     JOIN public.regulators r ON (((r.regulator_id)::text = (sr.regulator_id)::text)))
  WHERE ((sr.effective_to IS NULL) OR (sr.effective_to > CURRENT_DATE));


--
-- Name: v_sector_risks_resolved; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.v_sector_risks_resolved AS
 SELECT sr2.sector_id,
    r.id AS risk_id,
    r.risk_code,
    r.risk_title_en,
    r.risk_title_ar,
    COALESCE(sr2.sector_impact, r.risk_impact) AS resolved_impact,
    COALESCE(sr2.sector_likelihood, r.risk_likelihood) AS resolved_likelihood,
    'sector_override'::text AS resolution_source
   FROM (public.sector_risks sr2
     JOIN public.risks r ON ((r.id = sr2.risk_id)))
  WHERE (sr2.sector_id IS NOT NULL)
UNION ALL
 SELECT sim.sector_id,
    r.id AS risk_id,
    r.risk_code,
    r.risk_title_en,
    r.risk_title_ar,
    r.risk_impact AS resolved_impact,
    r.risk_likelihood AS resolved_likelihood,
    'isic_baseline'::text AS resolution_source
   FROM ((public.sector_isic_map sim
     JOIN public.isic_risks ir ON ((ir.isic_code = sim.isic_code)))
     JOIN public.risks r ON ((r.id = ir.risk_id)))
  WHERE (NOT (EXISTS ( SELECT 1
           FROM public.sector_risks sr3
          WHERE (((sr3.sector_id)::text = (sim.sector_id)::text) AND (sr3.risk_id = r.id)))));


--
-- Name: v_table_system_summary; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.v_table_system_summary AS
 SELECT table_system_flags.system_category,
    count(*) AS table_count,
    count(DISTINCT table_system_flags.module_name) AS module_count,
    sum(
        CASE
            WHEN table_system_flags.is_multi_tenant THEN 1
            ELSE 0
        END) AS multi_tenant_tables,
    sum(
        CASE
            WHEN table_system_flags.is_active THEN 1
            ELSE 0
        END) AS active_tables
   FROM public.table_system_flags
  GROUP BY table_system_flags.system_category
  ORDER BY (count(*)) DESC;


--
-- Name: vendor_assessments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.vendor_assessments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id character varying(16) NOT NULL,
    vendor_id character varying(200) NOT NULL,
    vendor_name character varying(200) NOT NULL,
    assessment_type character varying(50),
    assessment_date date,
    risk_rating character varying(50),
    criticality_tier character varying(50),
    services_provided text[],
    data_access_level character varying(50),
    compliance_certifications text[],
    sla_met boolean,
    issues_identified text[],
    remediation_required boolean DEFAULT false,
    next_assessment_date date,
    assessment_report_link text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: vendor_engagement_scores; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.vendor_engagement_scores (
    score_id uuid DEFAULT gen_random_uuid() NOT NULL,
    vendor_id uuid NOT NULL,
    total_score integer NOT NULL,
    response_time_score integer NOT NULL,
    completion_rate_score integer NOT NULL,
    evidence_timeliness_score integer NOT NULL,
    remediation_rate_score integer NOT NULL,
    computed_at timestamp with time zone DEFAULT now()
);


--
-- Name: war_rooms; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.war_rooms (
    war_room_id uuid DEFAULT gen_random_uuid() NOT NULL,
    incident_id character varying(64) NOT NULL,
    agent_id character varying(64) DEFAULT 'AGENT-A07'::character varying NOT NULL,
    status character varying(20) DEFAULT 'active'::character varying NOT NULL,
    raci_assignments jsonb DEFAULT '[]'::jsonb NOT NULL,
    timeline jsonb DEFAULT '[]'::jsonb NOT NULL,
    containment_steps jsonb DEFAULT '[]'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    resolved_at timestamp with time zone
);


--
-- Name: websocket_event_queue; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.websocket_event_queue (
    event_id uuid DEFAULT gen_random_uuid() NOT NULL,
    target_user_id character varying(100) NOT NULL,
    event_type character varying(100) NOT NULL,
    event_data jsonb DEFAULT '{}'::jsonb NOT NULL,
    delivered boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now(),
    delivered_at timestamp with time zone
);


--
-- Name: workflow_timeline_entries; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.workflow_timeline_entries (
    entry_id uuid DEFAULT gen_random_uuid() NOT NULL,
    workflow_type character varying(30) NOT NULL,
    workflow_step_id character varying(200) NOT NULL,
    assigned_participant_id character varying(64),
    participant_name character varying(300),
    participant_role character varying(100),
    is_agent boolean DEFAULT false,
    status character varying(30) DEFAULT 'pending'::character varying NOT NULL,
    due_date timestamp with time zone,
    assigned_at timestamp with time zone DEFAULT now(),
    completed_at timestamp with time zone,
    context jsonb DEFAULT '{}'::jsonb,
    parent_workflow_id character varying(200),
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT workflow_timeline_entries_status_check CHECK (((status)::text = ANY ((ARRAY['pending'::character varying, 'approved'::character varying, 'rejected'::character varying, 'delegated'::character varying, 'completed'::character varying, 'overdue'::character varying, 'in_progress'::character varying])::text[]))),
    CONSTRAINT workflow_timeline_entries_workflow_type_check CHECK (((workflow_type)::text = ANY ((ARRAY['approval'::character varying, 'task'::character varying, 'evidence_collection'::character varying, 'handoff'::character varying])::text[])))
);


--
-- Name: workspace_activation_log; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.workspace_activation_log (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    session_id uuid NOT NULL,
    tenant_id uuid,
    workspace_id uuid,
    event_type text NOT NULL,
    message text,
    details_json jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: workspace_onboarding_links; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.workspace_onboarding_links (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    workspace_id uuid NOT NULL,
    onboarding_session_id uuid NOT NULL,
    tenant_id character varying(16) NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: workspace_profile; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.workspace_profile (
    workspace_profile_id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    industry character varying(100),
    org_size character varying(20),
    risk_appetite character varying(20),
    escalation_level character varying(20),
    enforcement_mode character varying(20) DEFAULT 'advisory'::character varying NOT NULL,
    default_language character varying(10) DEFAULT 'en'::character varying NOT NULL,
    time_zone character varying(50) DEFAULT 'UTC'::character varying,
    fiscal_year_start integer,
    working_days text[] DEFAULT '{Monday,Tuesday,Wednesday,Thursday,Friday}'::text[],
    settings jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT workspace_profile_enforcement_mode_check CHECK (((enforcement_mode)::text = ANY ((ARRAY['advisory'::character varying, 'controlled'::character varying, 'strict'::character varying, 'autonomous'::character varying])::text[]))),
    CONSTRAINT workspace_profile_escalation_level_check CHECK (((escalation_level)::text = ANY ((ARRAY['normal'::character varying, 'elevated'::character varying, 'strict'::character varying, 'crisis'::character varying])::text[]))),
    CONSTRAINT workspace_profile_fiscal_year_start_check CHECK (((fiscal_year_start >= 1) AND (fiscal_year_start <= 12))),
    CONSTRAINT workspace_profile_org_size_check CHECK (((org_size)::text = ANY ((ARRAY['small'::character varying, 'medium'::character varying, 'large'::character varying, 'enterprise'::character varying])::text[]))),
    CONSTRAINT workspace_profile_risk_appetite_check CHECK (((risk_appetite)::text = ANY ((ARRAY['low'::character varying, 'moderate'::character varying, 'high'::character varying, 'very_high'::character varying])::text[])))
);


--
-- Name: authorization_audit_log audit_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.authorization_audit_log ALTER COLUMN audit_id SET DEFAULT nextval('public.authorization_audit_log_audit_id_seq'::regclass);


--
-- Name: authorization_mismatch_log mismatch_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.authorization_mismatch_log ALTER COLUMN mismatch_id SET DEFAULT nextval('public.authorization_mismatch_log_mismatch_id_seq'::regclass);


--
-- Name: change_log id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.change_log ALTER COLUMN id SET DEFAULT nextval('public.change_log_id_seq'::regclass);


--
-- Name: cross_mappings mapping_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cross_mappings ALTER COLUMN mapping_id SET DEFAULT nextval('public.cross_mappings_mapping_id_seq'::regclass);


--
-- Name: module_activation_requirements id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.module_activation_requirements ALTER COLUMN id SET DEFAULT nextval('public.module_activation_requirements_id_seq'::regclass);


--
-- Name: activated_templates activated_templates_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.activated_templates
    ADD CONSTRAINT activated_templates_pkey PRIMARY KEY (activation_id);


--
-- Name: activated_templates activated_templates_tenant_id_template_key_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.activated_templates
    ADD CONSTRAINT activated_templates_tenant_id_template_key_key UNIQUE (tenant_id, template_key);


--
-- Name: activity_feed activity_feed_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.activity_feed
    ADD CONSTRAINT activity_feed_pkey PRIMARY KEY (activity_id);


--
-- Name: activity_notifications activity_notifications_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.activity_notifications
    ADD CONSTRAINT activity_notifications_pkey PRIMARY KEY (notification_id);


--
-- Name: agent_collaboration_metrics agent_collaboration_metrics_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.agent_collaboration_metrics
    ADD CONSTRAINT agent_collaboration_metrics_pkey PRIMARY KEY (metric_id);


--
-- Name: agent_performance agent_performance_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.agent_performance
    ADD CONSTRAINT agent_performance_pkey PRIMARY KEY (record_id);


--
-- Name: agent_registry agent_registry_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.agent_registry
    ADD CONSTRAINT agent_registry_pkey PRIMARY KEY (agent_id);


--
-- Name: agent_status_log agent_status_log_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.agent_status_log
    ADD CONSTRAINT agent_status_log_pkey PRIMARY KEY (log_id);


--
-- Name: agent_suggestions agent_suggestions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.agent_suggestions
    ADD CONSTRAINT agent_suggestions_pkey PRIMARY KEY (suggestion_id);


--
-- Name: agrc_event_log agrc_event_log_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.agrc_event_log
    ADD CONSTRAINT agrc_event_log_pkey PRIMARY KEY (event_id);


--
-- Name: agrc_metrics_snapshots agrc_metrics_snapshots_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.agrc_metrics_snapshots
    ADD CONSTRAINT agrc_metrics_snapshots_pkey PRIMARY KEY (snapshot_id);


--
-- Name: agrc_os_cycle_log agrc_os_cycle_log_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.agrc_os_cycle_log
    ADD CONSTRAINT agrc_os_cycle_log_pkey PRIMARY KEY (cycle_id);


--
-- Name: agrc_runbooks agrc_runbooks_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.agrc_runbooks
    ADD CONSTRAINT agrc_runbooks_pkey PRIMARY KEY (runbook_id);


--
-- Name: ai_agent_status_log ai_agent_status_log_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ai_agent_status_log
    ADD CONSTRAINT ai_agent_status_log_pkey PRIMARY KEY (log_id);


--
-- Name: ai_sessions ai_sessions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ai_sessions
    ADD CONSTRAINT ai_sessions_pkey PRIMARY KEY (session_id);


--
-- Name: ai_step_executions ai_step_executions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ai_step_executions
    ADD CONSTRAINT ai_step_executions_pkey PRIMARY KEY (execution_id);


--
-- Name: ai_step_feedback ai_step_feedback_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ai_step_feedback
    ADD CONSTRAINT ai_step_feedback_pkey PRIMARY KEY (feedback_id);


--
-- Name: applicability_explanations applicability_explanations_object_type_sector_id_ref_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.applicability_explanations
    ADD CONSTRAINT applicability_explanations_object_type_sector_id_ref_code_key UNIQUE (object_type, sector_id, ref_code);


--
-- Name: applicability_explanations applicability_explanations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.applicability_explanations
    ADD CONSTRAINT applicability_explanations_pkey PRIMARY KEY (id);


--
-- Name: approval_chains approval_chains_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.approval_chains
    ADD CONSTRAINT approval_chains_pkey PRIMARY KEY (id);


--
-- Name: approval_decisions approval_decisions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.approval_decisions
    ADD CONSTRAINT approval_decisions_pkey PRIMARY KEY (decision_id);


--
-- Name: approval_pre_screens approval_pre_screens_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.approval_pre_screens
    ADD CONSTRAINT approval_pre_screens_pkey PRIMARY KEY (pre_screen_id);


--
-- Name: approval_requests approval_requests_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.approval_requests
    ADD CONSTRAINT approval_requests_pkey PRIMARY KEY (approval_id);


--
-- Name: approval_steps_log approval_steps_log_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.approval_steps_log
    ADD CONSTRAINT approval_steps_log_pkey PRIMARY KEY (log_id);


--
-- Name: audit_findings audit_findings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_findings
    ADD CONSTRAINT audit_findings_pkey PRIMARY KEY (id);


--
-- Name: audit_merkle_witnesses audit_merkle_witnesses_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_merkle_witnesses
    ADD CONSTRAINT audit_merkle_witnesses_pkey PRIMARY KEY (witness_id);


--
-- Name: audit_merkle_witnesses audit_merkle_witnesses_tenant_id_witness_date_source_table_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_merkle_witnesses
    ADD CONSTRAINT audit_merkle_witnesses_tenant_id_witness_date_source_table_key UNIQUE (tenant_id, witness_date, source_table);


--
-- Name: audit_prep_checklists audit_prep_checklists_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_prep_checklists
    ADD CONSTRAINT audit_prep_checklists_pkey PRIMARY KEY (checklist_id);


--
-- Name: audit_schedules audit_schedules_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_schedules
    ADD CONSTRAINT audit_schedules_pkey PRIMARY KEY (id);


--
-- Name: authority_matrix authority_matrix_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.authority_matrix
    ADD CONSTRAINT authority_matrix_pkey PRIMARY KEY (rule_id);


--
-- Name: authorization_audit_log authorization_audit_log_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.authorization_audit_log
    ADD CONSTRAINT authorization_audit_log_pkey PRIMARY KEY (audit_id);


--
-- Name: authorization_mismatch_log authorization_mismatch_log_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.authorization_mismatch_log
    ADD CONSTRAINT authorization_mismatch_log_pkey PRIMARY KEY (mismatch_id);


--
-- Name: auto_task_config auto_task_config_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.auto_task_config
    ADD CONSTRAINT auto_task_config_pkey PRIMARY KEY (config_id);


--
-- Name: autonomous_workflow_config autonomous_workflow_config_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.autonomous_workflow_config
    ADD CONSTRAINT autonomous_workflow_config_pkey PRIMARY KEY (config_id);


--
-- Name: bcp_config bcp_config_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bcp_config
    ADD CONSTRAINT bcp_config_pkey PRIMARY KEY (id);


--
-- Name: cadence_overrides cadence_overrides_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cadence_overrides
    ADD CONSTRAINT cadence_overrides_pkey PRIMARY KEY (domain);


--
-- Name: ccm_cycle_log ccm_cycle_log_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ccm_cycle_log
    ADD CONSTRAINT ccm_cycle_log_pkey PRIMARY KEY (cycle_id);


--
-- Name: change_log change_log_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.change_log
    ADD CONSTRAINT change_log_pkey PRIMARY KEY (id);


--
-- Name: co_draft_sessions co_draft_sessions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.co_draft_sessions
    ADD CONSTRAINT co_draft_sessions_pkey PRIMARY KEY (session_id);


--
-- Name: command_history command_history_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.command_history
    ADD CONSTRAINT command_history_pkey PRIMARY KEY (history_id);


--
-- Name: command_history command_history_user_id_command_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.command_history
    ADD CONSTRAINT command_history_user_id_command_id_key UNIQUE (user_id, command_id);


--
-- Name: command_palette_history command_palette_history_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.command_palette_history
    ADD CONSTRAINT command_palette_history_pkey PRIMARY KEY (history_id);


--
-- Name: company_profiles company_profiles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.company_profiles
    ADD CONSTRAINT company_profiles_pkey PRIMARY KEY (profile_id);


--
-- Name: company_profiles company_profiles_tenant_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.company_profiles
    ADD CONSTRAINT company_profiles_tenant_id_key UNIQUE (tenant_id);


--
-- Name: compliance_mappings compliance_mappings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.compliance_mappings
    ADD CONSTRAINT compliance_mappings_pkey PRIMARY KEY (id);


--
-- Name: compliance_risks compliance_risks_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.compliance_risks
    ADD CONSTRAINT compliance_risks_pkey PRIMARY KEY (id);


--
-- Name: compliance_risks compliance_risks_risk_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.compliance_risks
    ADD CONSTRAINT compliance_risks_risk_code_key UNIQUE (risk_code);


--
-- Name: config_entry_sources config_entry_sources_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.config_entry_sources
    ADD CONSTRAINT config_entry_sources_pkey PRIMARY KEY (entry_id);


--
-- Name: config_entry_sources config_entry_sources_tenant_id_config_section_entry_key_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.config_entry_sources
    ADD CONSTRAINT config_entry_sources_tenant_id_config_section_entry_key_key UNIQUE (tenant_id, config_section, entry_key);


--
-- Name: content_packs content_packs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.content_packs
    ADD CONSTRAINT content_packs_pkey PRIMARY KEY (pack_id);


--
-- Name: contextual_suggestions contextual_suggestions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.contextual_suggestions
    ADD CONSTRAINT contextual_suggestions_pkey PRIMARY KEY (suggestion_id);


--
-- Name: control_cross_mappings control_cross_mappings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.control_cross_mappings
    ADD CONSTRAINT control_cross_mappings_pkey PRIMARY KEY (id);


--
-- Name: control_domains control_domains_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.control_domains
    ADD CONSTRAINT control_domains_pkey PRIMARY KEY (id);


--
-- Name: control_domains control_domains_version_id_domain_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.control_domains
    ADD CONSTRAINT control_domains_version_id_domain_code_key UNIQUE (version_id, domain_code);


--
-- Name: control_evidence_requirements control_evidence_requirements_control_id_evidence_type_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.control_evidence_requirements
    ADD CONSTRAINT control_evidence_requirements_control_id_evidence_type_code_key UNIQUE (control_id, evidence_type_code);


--
-- Name: control_evidence_requirements control_evidence_requirements_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.control_evidence_requirements
    ADD CONSTRAINT control_evidence_requirements_pkey PRIMARY KEY (id);


--
-- Name: control_regulator_mapping control_regulator_mapping_control_id_regulator_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.control_regulator_mapping
    ADD CONSTRAINT control_regulator_mapping_control_id_regulator_id_key UNIQUE (control_id, regulator_id);


--
-- Name: control_regulator_mapping control_regulator_mapping_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.control_regulator_mapping
    ADD CONSTRAINT control_regulator_mapping_pkey PRIMARY KEY (id);


--
-- Name: control_requirements control_requirements_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.control_requirements
    ADD CONSTRAINT control_requirements_pkey PRIMARY KEY (id);


--
-- Name: control_sectors control_sectors_control_id_sector_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.control_sectors
    ADD CONSTRAINT control_sectors_control_id_sector_code_key UNIQUE (control_id, sector_code);


--
-- Name: control_sectors control_sectors_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.control_sectors
    ADD CONSTRAINT control_sectors_pkey PRIMARY KEY (id);


--
-- Name: cross_mappings cross_mappings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cross_mappings
    ADD CONSTRAINT cross_mappings_pkey PRIMARY KEY (mapping_id);


--
-- Name: data_classifications data_classifications_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.data_classifications
    ADD CONSTRAINT data_classifications_pkey PRIMARY KEY (id);


--
-- Name: data_governance_config data_governance_config_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.data_governance_config
    ADD CONSTRAINT data_governance_config_pkey PRIMARY KEY (id);


--
-- Name: department_roles department_roles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.department_roles
    ADD CONSTRAINT department_roles_pkey PRIMARY KEY (id);


--
-- Name: edition_limits edition_limits_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.edition_limits
    ADD CONSTRAINT edition_limits_pkey PRIMARY KEY (plan);


--
-- Name: email_verification_tokens email_verification_tokens_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.email_verification_tokens
    ADD CONSTRAINT email_verification_tokens_pkey PRIMARY KEY (id);


--
-- Name: email_verification_tokens email_verification_tokens_token_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.email_verification_tokens
    ADD CONSTRAINT email_verification_tokens_token_key UNIQUE (token);


--
-- Name: enforcement_gate_log enforcement_gate_log_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.enforcement_gate_log
    ADD CONSTRAINT enforcement_gate_log_pkey PRIMARY KEY (gate_log_id);


--
-- Name: engagement_misalignment engagement_misalignment_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.engagement_misalignment
    ADD CONSTRAINT engagement_misalignment_pkey PRIMARY KEY (misalignment_id);


--
-- Name: engagement_os_cycle_log engagement_os_cycle_log_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.engagement_os_cycle_log
    ADD CONSTRAINT engagement_os_cycle_log_pkey PRIMARY KEY (cycle_id);


--
-- Name: entity_link_metadata entity_link_metadata_link_id_key_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.entity_link_metadata
    ADD CONSTRAINT entity_link_metadata_link_id_key_key UNIQUE (link_id, key);


--
-- Name: entity_link_metadata entity_link_metadata_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.entity_link_metadata
    ADD CONSTRAINT entity_link_metadata_pkey PRIMARY KEY (metadata_id);


--
-- Name: entity_links entity_links_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.entity_links
    ADD CONSTRAINT entity_links_pkey PRIMARY KEY (link_id);


--
-- Name: entity_links entity_links_source_type_source_id_target_type_target_id_re_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.entity_links
    ADD CONSTRAINT entity_links_source_type_source_id_target_type_target_id_re_key UNIQUE (source_type, source_id, target_type, target_id, relationship_type);


--
-- Name: erp_connections erp_connections_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.erp_connections
    ADD CONSTRAINT erp_connections_pkey PRIMARY KEY (connection_id);


--
-- Name: erp_field_mappings erp_field_mappings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.erp_field_mappings
    ADD CONSTRAINT erp_field_mappings_pkey PRIMARY KEY (mapping_id);


--
-- Name: erp_sync_history erp_sync_history_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.erp_sync_history
    ADD CONSTRAINT erp_sync_history_pkey PRIMARY KEY (sync_id);


--
-- Name: escalation_rules escalation_rules_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.escalation_rules
    ADD CONSTRAINT escalation_rules_pkey PRIMARY KEY (id);


--
-- Name: escalation_thresholds escalation_thresholds_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.escalation_thresholds
    ADD CONSTRAINT escalation_thresholds_pkey PRIMARY KEY (level);


--
-- Name: event_type_registry event_type_registry_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.event_type_registry
    ADD CONSTRAINT event_type_registry_pkey PRIMARY KEY (event_type);


--
-- Name: evidence_config evidence_config_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.evidence_config
    ADD CONSTRAINT evidence_config_pkey PRIMARY KEY (id);


--
-- Name: evidence_lifecycle evidence_lifecycle_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.evidence_lifecycle
    ADD CONSTRAINT evidence_lifecycle_pkey PRIMARY KEY (id);


--
-- Name: evidence_relay_queue evidence_relay_queue_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.evidence_relay_queue
    ADD CONSTRAINT evidence_relay_queue_pkey PRIMARY KEY (relay_id);


--
-- Name: evidence_requirements evidence_requirements_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.evidence_requirements
    ADD CONSTRAINT evidence_requirements_pkey PRIMARY KEY (id);


--
-- Name: evidence_types evidence_types_evidence_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.evidence_types
    ADD CONSTRAINT evidence_types_evidence_code_key UNIQUE (evidence_code);


--
-- Name: evidence_types evidence_types_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.evidence_types
    ADD CONSTRAINT evidence_types_pkey PRIMARY KEY (id);


--
-- Name: exception_management exception_management_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.exception_management
    ADD CONSTRAINT exception_management_pkey PRIMARY KEY (id);


--
-- Name: execution_plan_snapshots execution_plan_snapshots_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.execution_plan_snapshots
    ADD CONSTRAINT execution_plan_snapshots_pkey PRIMARY KEY (id);


--
-- Name: first_visits first_visits_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.first_visits
    ADD CONSTRAINT first_visits_pkey PRIMARY KEY (tenant_id, user_id, module);


--
-- Name: framework_alias framework_alias_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.framework_alias
    ADD CONSTRAINT framework_alias_pkey PRIMARY KEY (alias_code);


--
-- Name: framework_relationships framework_relationships_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.framework_relationships
    ADD CONSTRAINT framework_relationships_pkey PRIMARY KEY (id);


--
-- Name: framework_scoring_policies framework_scoring_policies_framework_code_scoring_model_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.framework_scoring_policies
    ADD CONSTRAINT framework_scoring_policies_framework_code_scoring_model_key UNIQUE (framework_code, scoring_model);


--
-- Name: framework_scoring_policies framework_scoring_policies_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.framework_scoring_policies
    ADD CONSTRAINT framework_scoring_policies_pkey PRIMARY KEY (id);


--
-- Name: framework_version_diffs framework_version_diffs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.framework_version_diffs
    ADD CONSTRAINT framework_version_diffs_pkey PRIMARY KEY (id);


--
-- Name: framework_versions framework_versions_framework_code_version_number_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.framework_versions
    ADD CONSTRAINT framework_versions_framework_code_version_number_key UNIQUE (framework_code, version_number);


--
-- Name: framework_versions framework_versions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.framework_versions
    ADD CONSTRAINT framework_versions_pkey PRIMARY KEY (id);


--
-- Name: function_authorities function_authorities_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.function_authorities
    ADD CONSTRAINT function_authorities_pkey PRIMARY KEY (authority_id);


--
-- Name: governance_config governance_config_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.governance_config
    ADD CONSTRAINT governance_config_pkey PRIMARY KEY (id);


--
-- Name: governance_risk_appetite governance_risk_appetite_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.governance_risk_appetite
    ADD CONSTRAINT governance_risk_appetite_pkey PRIMARY KEY (category);


--
-- Name: handoff_log handoff_log_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.handoff_log
    ADD CONSTRAINT handoff_log_pkey PRIMARY KEY (handoff_id);


--
-- Name: incident_categories incident_categories_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.incident_categories
    ADD CONSTRAINT incident_categories_pkey PRIMARY KEY (id);


--
-- Name: inline_edit_history inline_edit_history_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inline_edit_history
    ADD CONSTRAINT inline_edit_history_pkey PRIMARY KEY (edit_id);


--
-- Name: instrument_structure instrument_structure_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.instrument_structure
    ADD CONSTRAINT instrument_structure_pkey PRIMARY KEY (node_id);


--
-- Name: instruments instruments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.instruments
    ADD CONSTRAINT instruments_pkey PRIMARY KEY (instrument_id);


--
-- Name: integrations integrations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.integrations
    ADD CONSTRAINT integrations_pkey PRIMARY KEY (id);


--
-- Name: intervention_audit_log intervention_audit_log_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.intervention_audit_log
    ADD CONSTRAINT intervention_audit_log_pkey PRIMARY KEY (intervention_id);


--
-- Name: isic_risks isic_risks_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.isic_risks
    ADD CONSTRAINT isic_risks_pkey PRIMARY KEY (isic_code, risk_id);


--
-- Name: job_executions job_executions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.job_executions
    ADD CONSTRAINT job_executions_pkey PRIMARY KEY (execution_id);


--
-- Name: job_registry job_registry_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.job_registry
    ADD CONSTRAINT job_registry_pkey PRIMARY KEY (job_name);


--
-- Name: journey_state journey_state_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.journey_state
    ADD CONSTRAINT journey_state_pkey PRIMARY KEY (state_id);


--
-- Name: journey_state journey_state_tenant_id_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.journey_state
    ADD CONSTRAINT journey_state_tenant_id_user_id_key UNIQUE (tenant_id, user_id);


--
-- Name: kri_config kri_config_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.kri_config
    ADD CONSTRAINT kri_config_pkey PRIMARY KEY (id);


--
-- Name: landing_content landing_content_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.landing_content
    ADD CONSTRAINT landing_content_pkey PRIMARY KEY (content_id);


--
-- Name: langgraph_checkpoints langgraph_checkpoints_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.langgraph_checkpoints
    ADD CONSTRAINT langgraph_checkpoints_pkey PRIMARY KEY (thread_id, checkpoint_id);


--
-- Name: lead_captures lead_captures_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lead_captures
    ADD CONSTRAINT lead_captures_pkey PRIMARY KEY (id);


--
-- Name: lifecycle_checkpoints lifecycle_checkpoints_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lifecycle_checkpoints
    ADD CONSTRAINT lifecycle_checkpoints_pkey PRIMARY KEY (checkpoint_id);


--
-- Name: lifecycle_template_injections lifecycle_template_injections_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lifecycle_template_injections
    ADD CONSTRAINT lifecycle_template_injections_pkey PRIMARY KEY (injection_id);


--
-- Name: lifecycle_template_injections lifecycle_template_injections_tenant_id_stage_template_key_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lifecycle_template_injections
    ADD CONSTRAINT lifecycle_template_injections_tenant_id_stage_template_key_key UNIQUE (tenant_id, stage, template_key);


--
-- Name: login_attempts login_attempts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.login_attempts
    ADD CONSTRAINT login_attempts_pkey PRIMARY KEY (attempt_id);


--
-- Name: lookup_approval_authorities lookup_approval_authorities_authority_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lookup_approval_authorities
    ADD CONSTRAINT lookup_approval_authorities_authority_code_key UNIQUE (authority_code);


--
-- Name: lookup_approval_authorities lookup_approval_authorities_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lookup_approval_authorities
    ADD CONSTRAINT lookup_approval_authorities_pkey PRIMARY KEY (id);


--
-- Name: lookup_approval_models lookup_approval_models_model_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lookup_approval_models
    ADD CONSTRAINT lookup_approval_models_model_code_key UNIQUE (model_code);


--
-- Name: lookup_approval_models lookup_approval_models_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lookup_approval_models
    ADD CONSTRAINT lookup_approval_models_pkey PRIMARY KEY (id);


--
-- Name: lookup_authority_frameworks lookup_authority_frameworks_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lookup_authority_frameworks
    ADD CONSTRAINT lookup_authority_frameworks_pkey PRIMARY KEY (id);


--
-- Name: lookup_authority_sector_mapping lookup_authority_sector_mapping_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lookup_authority_sector_mapping
    ADD CONSTRAINT lookup_authority_sector_mapping_pkey PRIMARY KEY (id);


--
-- Name: lookup_automation_levels lookup_automation_levels_level_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lookup_automation_levels
    ADD CONSTRAINT lookup_automation_levels_level_code_key UNIQUE (level_code);


--
-- Name: lookup_automation_levels lookup_automation_levels_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lookup_automation_levels
    ADD CONSTRAINT lookup_automation_levels_pkey PRIMARY KEY (id);


--
-- Name: _retired_lookup_cities lookup_cities_city_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public._retired_lookup_cities
    ADD CONSTRAINT lookup_cities_city_code_key UNIQUE (city_code);


--
-- Name: lookup_cities lookup_cities_city_code_key1; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lookup_cities
    ADD CONSTRAINT lookup_cities_city_code_key1 UNIQUE (city_code);


--
-- Name: _retired_lookup_cities lookup_cities_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public._retired_lookup_cities
    ADD CONSTRAINT lookup_cities_pkey PRIMARY KEY (id);


--
-- Name: lookup_cities lookup_cities_pkey1; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lookup_cities
    ADD CONSTRAINT lookup_cities_pkey1 PRIMARY KEY (id);


--
-- Name: lookup_cloud_providers lookup_cloud_providers_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lookup_cloud_providers
    ADD CONSTRAINT lookup_cloud_providers_pkey PRIMARY KEY (id);


--
-- Name: lookup_cloud_providers lookup_cloud_providers_provider_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lookup_cloud_providers
    ADD CONSTRAINT lookup_cloud_providers_provider_code_key UNIQUE (provider_code);


--
-- Name: lookup_connectors lookup_connectors_connector_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lookup_connectors
    ADD CONSTRAINT lookup_connectors_connector_code_key UNIQUE (connector_code);


--
-- Name: lookup_connectors lookup_connectors_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lookup_connectors
    ADD CONSTRAINT lookup_connectors_pkey PRIMARY KEY (id);


--
-- Name: lookup_control_testing lookup_control_testing_approach_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lookup_control_testing
    ADD CONSTRAINT lookup_control_testing_approach_code_key UNIQUE (approach_code);


--
-- Name: lookup_control_testing lookup_control_testing_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lookup_control_testing
    ADD CONSTRAINT lookup_control_testing_pkey PRIMARY KEY (id);


--
-- Name: _retired_lookup_countries lookup_countries_country_code_3_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public._retired_lookup_countries
    ADD CONSTRAINT lookup_countries_country_code_3_key UNIQUE (country_code_3);


--
-- Name: lookup_countries lookup_countries_country_code_3_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lookup_countries
    ADD CONSTRAINT lookup_countries_country_code_3_unique UNIQUE (country_code_3);


--
-- Name: _retired_lookup_countries lookup_countries_country_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public._retired_lookup_countries
    ADD CONSTRAINT lookup_countries_country_code_key UNIQUE (country_code);


--
-- Name: lookup_countries lookup_countries_country_code_key1; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lookup_countries
    ADD CONSTRAINT lookup_countries_country_code_key1 UNIQUE (country_code);


--
-- Name: _retired_lookup_countries lookup_countries_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public._retired_lookup_countries
    ADD CONSTRAINT lookup_countries_pkey PRIMARY KEY (id);


--
-- Name: lookup_countries lookup_countries_pkey1; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lookup_countries
    ADD CONSTRAINT lookup_countries_pkey1 PRIMARY KEY (id);


--
-- Name: lookup_data_classifications lookup_data_classifications_classification_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lookup_data_classifications
    ADD CONSTRAINT lookup_data_classifications_classification_code_key UNIQUE (classification_code);


--
-- Name: lookup_data_classifications lookup_data_classifications_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lookup_data_classifications
    ADD CONSTRAINT lookup_data_classifications_pkey PRIMARY KEY (id);


--
-- Name: lookup_data_residency lookup_data_residency_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lookup_data_residency
    ADD CONSTRAINT lookup_data_residency_pkey PRIMARY KEY (id);


--
-- Name: lookup_data_residency lookup_data_residency_residency_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lookup_data_residency
    ADD CONSTRAINT lookup_data_residency_residency_code_key UNIQUE (residency_code);


--
-- Name: lookup_data_sources lookup_data_sources_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lookup_data_sources
    ADD CONSTRAINT lookup_data_sources_pkey PRIMARY KEY (id);


--
-- Name: lookup_department_types lookup_department_types_dept_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lookup_department_types
    ADD CONSTRAINT lookup_department_types_dept_code_key UNIQUE (dept_code);


--
-- Name: lookup_department_types lookup_department_types_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lookup_department_types
    ADD CONSTRAINT lookup_department_types_pkey PRIMARY KEY (id);


--
-- Name: _retired_lookup_employee_ranges lookup_employee_ranges_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public._retired_lookup_employee_ranges
    ADD CONSTRAINT lookup_employee_ranges_pkey PRIMARY KEY (id);


--
-- Name: lookup_employee_ranges lookup_employee_ranges_pkey1; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lookup_employee_ranges
    ADD CONSTRAINT lookup_employee_ranges_pkey1 PRIMARY KEY (id);


--
-- Name: _retired_lookup_employee_ranges lookup_employee_ranges_range_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public._retired_lookup_employee_ranges
    ADD CONSTRAINT lookup_employee_ranges_range_code_key UNIQUE (range_code);


--
-- Name: lookup_employee_ranges lookup_employee_ranges_range_code_key1; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lookup_employee_ranges
    ADD CONSTRAINT lookup_employee_ranges_range_code_key1 UNIQUE (range_code);


--
-- Name: lookup_escalation_models lookup_escalation_models_model_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lookup_escalation_models
    ADD CONSTRAINT lookup_escalation_models_model_code_key UNIQUE (model_code);


--
-- Name: lookup_escalation_models lookup_escalation_models_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lookup_escalation_models
    ADD CONSTRAINT lookup_escalation_models_pkey PRIMARY KEY (id);


--
-- Name: lookup_finding_categories lookup_finding_categories_category_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lookup_finding_categories
    ADD CONSTRAINT lookup_finding_categories_category_code_key UNIQUE (category_code);


--
-- Name: lookup_finding_categories lookup_finding_categories_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lookup_finding_categories
    ADD CONSTRAINT lookup_finding_categories_pkey PRIMARY KEY (id);


--
-- Name: lookup_framework_module_triggers lookup_framework_module_triggers_framework_code_module_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lookup_framework_module_triggers
    ADD CONSTRAINT lookup_framework_module_triggers_framework_code_module_code_key UNIQUE (framework_code, module_code);


--
-- Name: lookup_framework_module_triggers lookup_framework_module_triggers_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lookup_framework_module_triggers
    ADD CONSTRAINT lookup_framework_module_triggers_pkey PRIMARY KEY (id);


--
-- Name: _retired_lookup_frameworks lookup_frameworks_framework_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public._retired_lookup_frameworks
    ADD CONSTRAINT lookup_frameworks_framework_code_key UNIQUE (framework_code);


--
-- Name: lookup_frameworks lookup_frameworks_framework_code_key1; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lookup_frameworks
    ADD CONSTRAINT lookup_frameworks_framework_code_key1 UNIQUE (framework_code);


--
-- Name: _retired_lookup_frameworks lookup_frameworks_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public._retired_lookup_frameworks
    ADD CONSTRAINT lookup_frameworks_pkey PRIMARY KEY (id);


--
-- Name: lookup_frameworks lookup_frameworks_pkey1; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lookup_frameworks
    ADD CONSTRAINT lookup_frameworks_pkey1 PRIMARY KEY (id);


--
-- Name: lookup_frequencies lookup_frequencies_frequency_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lookup_frequencies
    ADD CONSTRAINT lookup_frequencies_frequency_code_key UNIQUE (frequency_code);


--
-- Name: lookup_frequencies lookup_frequencies_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lookup_frequencies
    ADD CONSTRAINT lookup_frequencies_pkey PRIMARY KEY (id);


--
-- Name: lookup_gdpr_levels lookup_gdpr_levels_level_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lookup_gdpr_levels
    ADD CONSTRAINT lookup_gdpr_levels_level_code_key UNIQUE (level_code);


--
-- Name: lookup_gdpr_levels lookup_gdpr_levels_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lookup_gdpr_levels
    ADD CONSTRAINT lookup_gdpr_levels_pkey PRIMARY KEY (id);


--
-- Name: lookup_grc_role_staffing lookup_grc_role_staffing_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lookup_grc_role_staffing
    ADD CONSTRAINT lookup_grc_role_staffing_pkey PRIMARY KEY (id);


--
-- Name: lookup_grc_tools lookup_grc_tools_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lookup_grc_tools
    ADD CONSTRAINT lookup_grc_tools_pkey PRIMARY KEY (id);


--
-- Name: lookup_grc_tools lookup_grc_tools_tool_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lookup_grc_tools
    ADD CONSTRAINT lookup_grc_tools_tool_code_key UNIQUE (tool_code);


--
-- Name: lookup_incident_categories lookup_incident_categories_category_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lookup_incident_categories
    ADD CONSTRAINT lookup_incident_categories_category_code_key UNIQUE (category_code);


--
-- Name: lookup_incident_categories lookup_incident_categories_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lookup_incident_categories
    ADD CONSTRAINT lookup_incident_categories_pkey PRIMARY KEY (id);


--
-- Name: lookup_isic4_sectors lookup_isic4_sectors_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lookup_isic4_sectors
    ADD CONSTRAINT lookup_isic4_sectors_pkey PRIMARY KEY (id);


--
-- Name: lookup_isic4_sectors lookup_isic4_sectors_section_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lookup_isic4_sectors
    ADD CONSTRAINT lookup_isic4_sectors_section_code_key UNIQUE (section_code);


--
-- Name: lookup_ksa_cities lookup_ksa_cities_city_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lookup_ksa_cities
    ADD CONSTRAINT lookup_ksa_cities_city_code_key UNIQUE (city_code);


--
-- Name: lookup_ksa_cities lookup_ksa_cities_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lookup_ksa_cities
    ADD CONSTRAINT lookup_ksa_cities_pkey PRIMARY KEY (id);


--
-- Name: lookup_ksa_provinces lookup_ksa_provinces_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lookup_ksa_provinces
    ADD CONSTRAINT lookup_ksa_provinces_pkey PRIMARY KEY (id);


--
-- Name: lookup_ksa_provinces lookup_ksa_provinces_province_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lookup_ksa_provinces
    ADD CONSTRAINT lookup_ksa_provinces_province_code_key UNIQUE (province_code);


--
-- Name: lookup_ksa_regulatory_authorities lookup_ksa_regulatory_authorities_authority_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lookup_ksa_regulatory_authorities
    ADD CONSTRAINT lookup_ksa_regulatory_authorities_authority_code_key UNIQUE (authority_code);


--
-- Name: lookup_ksa_regulatory_authorities lookup_ksa_regulatory_authorities_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lookup_ksa_regulatory_authorities
    ADD CONSTRAINT lookup_ksa_regulatory_authorities_pkey PRIMARY KEY (id);


--
-- Name: _retired_lookup_languages lookup_languages_language_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public._retired_lookup_languages
    ADD CONSTRAINT lookup_languages_language_code_key UNIQUE (language_code);


--
-- Name: lookup_languages lookup_languages_language_code_key1; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lookup_languages
    ADD CONSTRAINT lookup_languages_language_code_key1 UNIQUE (language_code);


--
-- Name: _retired_lookup_languages lookup_languages_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public._retired_lookup_languages
    ADD CONSTRAINT lookup_languages_pkey PRIMARY KEY (id);


--
-- Name: lookup_languages lookup_languages_pkey1; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lookup_languages
    ADD CONSTRAINT lookup_languages_pkey1 PRIMARY KEY (id);


--
-- Name: lookup_maturity_levels lookup_maturity_levels_level_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lookup_maturity_levels
    ADD CONSTRAINT lookup_maturity_levels_level_code_key UNIQUE (level_code);


--
-- Name: lookup_maturity_levels lookup_maturity_levels_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lookup_maturity_levels
    ADD CONSTRAINT lookup_maturity_levels_pkey PRIMARY KEY (id);


--
-- Name: lookup_nca_sectors lookup_nca_sectors_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lookup_nca_sectors
    ADD CONSTRAINT lookup_nca_sectors_pkey PRIMARY KEY (id);


--
-- Name: lookup_nca_sectors lookup_nca_sectors_sector_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lookup_nca_sectors
    ADD CONSTRAINT lookup_nca_sectors_sector_code_key UNIQUE (sector_code);


--
-- Name: lookup_org_models lookup_org_models_model_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lookup_org_models
    ADD CONSTRAINT lookup_org_models_model_code_key UNIQUE (model_code);


--
-- Name: lookup_org_models lookup_org_models_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lookup_org_models
    ADD CONSTRAINT lookup_org_models_pkey PRIMARY KEY (id);


--
-- Name: lookup_org_types lookup_org_types_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lookup_org_types
    ADD CONSTRAINT lookup_org_types_pkey PRIMARY KEY (id);


--
-- Name: lookup_org_types lookup_org_types_type_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lookup_org_types
    ADD CONSTRAINT lookup_org_types_type_code_key UNIQUE (type_code);


--
-- Name: lookup_outsourced_functions lookup_outsourced_functions_function_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lookup_outsourced_functions
    ADD CONSTRAINT lookup_outsourced_functions_function_code_key UNIQUE (function_code);


--
-- Name: lookup_outsourced_functions lookup_outsourced_functions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lookup_outsourced_functions
    ADD CONSTRAINT lookup_outsourced_functions_pkey PRIMARY KEY (id);


--
-- Name: lookup_pci_levels lookup_pci_levels_level_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lookup_pci_levels
    ADD CONSTRAINT lookup_pci_levels_level_code_key UNIQUE (level_code);


--
-- Name: lookup_pci_levels lookup_pci_levels_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lookup_pci_levels
    ADD CONSTRAINT lookup_pci_levels_pkey PRIMARY KEY (id);


--
-- Name: lookup_pdpl_scopes lookup_pdpl_scopes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lookup_pdpl_scopes
    ADD CONSTRAINT lookup_pdpl_scopes_pkey PRIMARY KEY (id);


--
-- Name: lookup_pdpl_scopes lookup_pdpl_scopes_scope_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lookup_pdpl_scopes
    ADD CONSTRAINT lookup_pdpl_scopes_scope_code_key UNIQUE (scope_code);


--
-- Name: lookup_register_formats lookup_register_formats_format_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lookup_register_formats
    ADD CONSTRAINT lookup_register_formats_format_code_key UNIQUE (format_code);


--
-- Name: lookup_register_formats lookup_register_formats_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lookup_register_formats
    ADD CONSTRAINT lookup_register_formats_pkey PRIMARY KEY (id);


--
-- Name: lookup_reporting_lines lookup_reporting_lines_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lookup_reporting_lines
    ADD CONSTRAINT lookup_reporting_lines_pkey PRIMARY KEY (id);


--
-- Name: lookup_reporting_lines lookup_reporting_lines_role_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lookup_reporting_lines
    ADD CONSTRAINT lookup_reporting_lines_role_code_key UNIQUE (role_code);


--
-- Name: lookup_reporting_obligations lookup_reporting_obligations_obligation_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lookup_reporting_obligations
    ADD CONSTRAINT lookup_reporting_obligations_obligation_code_key UNIQUE (obligation_code);


--
-- Name: lookup_reporting_obligations lookup_reporting_obligations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lookup_reporting_obligations
    ADD CONSTRAINT lookup_reporting_obligations_pkey PRIMARY KEY (id);


--
-- Name: lookup_risk_appetites lookup_risk_appetites_appetite_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lookup_risk_appetites
    ADD CONSTRAINT lookup_risk_appetites_appetite_code_key UNIQUE (appetite_code);


--
-- Name: lookup_risk_appetites lookup_risk_appetites_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lookup_risk_appetites
    ADD CONSTRAINT lookup_risk_appetites_pkey PRIMARY KEY (id);


--
-- Name: lookup_risk_methodologies lookup_risk_methodologies_method_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lookup_risk_methodologies
    ADD CONSTRAINT lookup_risk_methodologies_method_code_key UNIQUE (method_code);


--
-- Name: lookup_risk_methodologies lookup_risk_methodologies_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lookup_risk_methodologies
    ADD CONSTRAINT lookup_risk_methodologies_pkey PRIMARY KEY (id);


--
-- Name: lookup_sector_team_templates lookup_sector_team_templates_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lookup_sector_team_templates
    ADD CONSTRAINT lookup_sector_team_templates_pkey PRIMARY KEY (id);


--
-- Name: lookup_sector_team_templates lookup_sector_team_templates_sector_code_function_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lookup_sector_team_templates
    ADD CONSTRAINT lookup_sector_team_templates_sector_code_function_code_key UNIQUE (sector_code, function_code);


--
-- Name: _retired_lookup_sectors lookup_sectors_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public._retired_lookup_sectors
    ADD CONSTRAINT lookup_sectors_pkey PRIMARY KEY (id);


--
-- Name: lookup_sectors lookup_sectors_pkey1; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lookup_sectors
    ADD CONSTRAINT lookup_sectors_pkey1 PRIMARY KEY (id);


--
-- Name: _retired_lookup_sectors lookup_sectors_sector_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public._retired_lookup_sectors
    ADD CONSTRAINT lookup_sectors_sector_code_key UNIQUE (sector_code);


--
-- Name: lookup_sectors lookup_sectors_sector_code_key1; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lookup_sectors
    ADD CONSTRAINT lookup_sectors_sector_code_key1 UNIQUE (sector_code);


--
-- Name: lookup_sla_tiers lookup_sla_tiers_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lookup_sla_tiers
    ADD CONSTRAINT lookup_sla_tiers_pkey PRIMARY KEY (id);


--
-- Name: lookup_sla_tiers lookup_sla_tiers_sla_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lookup_sla_tiers
    ADD CONSTRAINT lookup_sla_tiers_sla_code_key UNIQUE (sla_code);


--
-- Name: lookup_sso_protocols lookup_sso_protocols_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lookup_sso_protocols
    ADD CONSTRAINT lookup_sso_protocols_pkey PRIMARY KEY (id);


--
-- Name: lookup_sso_protocols lookup_sso_protocols_protocol_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lookup_sso_protocols
    ADD CONSTRAINT lookup_sso_protocols_protocol_code_key UNIQUE (protocol_code);


--
-- Name: lookup_sso_providers lookup_sso_providers_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lookup_sso_providers
    ADD CONSTRAINT lookup_sso_providers_pkey PRIMARY KEY (id);


--
-- Name: lookup_sso_providers lookup_sso_providers_provider_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lookup_sso_providers
    ADD CONSTRAINT lookup_sso_providers_provider_code_key UNIQUE (provider_code);


--
-- Name: lookup_team_control_mapping lookup_team_control_mapping_function_code_control_domain_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lookup_team_control_mapping
    ADD CONSTRAINT lookup_team_control_mapping_function_code_control_domain_key UNIQUE (function_code, control_domain);


--
-- Name: lookup_team_control_mapping lookup_team_control_mapping_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lookup_team_control_mapping
    ADD CONSTRAINT lookup_team_control_mapping_pkey PRIMARY KEY (id);


--
-- Name: lookup_team_framework_mapping lookup_team_framework_mapping_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lookup_team_framework_mapping
    ADD CONSTRAINT lookup_team_framework_mapping_pkey PRIMARY KEY (id);


--
-- Name: lookup_team_functions lookup_team_functions_function_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lookup_team_functions
    ADD CONSTRAINT lookup_team_functions_function_code_key UNIQUE (function_code);


--
-- Name: lookup_team_functions lookup_team_functions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lookup_team_functions
    ADD CONSTRAINT lookup_team_functions_pkey PRIMARY KEY (id);


--
-- Name: _retired_lookup_timezones lookup_timezones_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public._retired_lookup_timezones
    ADD CONSTRAINT lookup_timezones_pkey PRIMARY KEY (id);


--
-- Name: lookup_timezones lookup_timezones_pkey1; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lookup_timezones
    ADD CONSTRAINT lookup_timezones_pkey1 PRIMARY KEY (id);


--
-- Name: _retired_lookup_timezones lookup_timezones_timezone_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public._retired_lookup_timezones
    ADD CONSTRAINT lookup_timezones_timezone_code_key UNIQUE (timezone_code);


--
-- Name: lookup_timezones lookup_timezones_timezone_code_key1; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lookup_timezones
    ADD CONSTRAINT lookup_timezones_timezone_code_key1 UNIQUE (timezone_code);


--
-- Name: lookup_transfer_mechanisms lookup_transfer_mechanisms_mechanism_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lookup_transfer_mechanisms
    ADD CONSTRAINT lookup_transfer_mechanisms_mechanism_code_key UNIQUE (mechanism_code);


--
-- Name: lookup_transfer_mechanisms lookup_transfer_mechanisms_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lookup_transfer_mechanisms
    ADD CONSTRAINT lookup_transfer_mechanisms_pkey PRIMARY KEY (id);


--
-- Name: manifest_cache manifest_cache_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.manifest_cache
    ADD CONSTRAINT manifest_cache_pkey PRIMARY KEY (tenant_id);


--
-- Name: manifest_snapshots manifest_snapshots_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.manifest_snapshots
    ADD CONSTRAINT manifest_snapshots_pkey PRIMARY KEY (snapshot_id);


--
-- Name: maturity_assessments maturity_assessments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.maturity_assessments
    ADD CONSTRAINT maturity_assessments_pkey PRIMARY KEY (id);


--
-- Name: maturity_questions maturity_questions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.maturity_questions
    ADD CONSTRAINT maturity_questions_pkey PRIMARY KEY (question_id);


--
-- Name: maturity_snapshots maturity_snapshots_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.maturity_snapshots
    ADD CONSTRAINT maturity_snapshots_pkey PRIMARY KEY (snapshot_id);


--
-- Name: migration_config migration_config_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.migration_config
    ADD CONSTRAINT migration_config_pkey PRIMARY KEY (id);


--
-- Name: module_activation_requests module_activation_requests_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.module_activation_requests
    ADD CONSTRAINT module_activation_requests_pkey PRIMARY KEY (id);


--
-- Name: module_activation_requirements module_activation_requirement_product_key_module_code_check_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.module_activation_requirements
    ADD CONSTRAINT module_activation_requirement_product_key_module_code_check_key UNIQUE (product_key, module_code, check_key);


--
-- Name: module_activation_requirements module_activation_requirements_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.module_activation_requirements
    ADD CONSTRAINT module_activation_requirements_pkey PRIMARY KEY (id);


--
-- Name: module_provisioning_steps module_provisioning_steps_module_code_step_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.module_provisioning_steps
    ADD CONSTRAINT module_provisioning_steps_module_code_step_code_key UNIQUE (module_code, step_code);


--
-- Name: module_provisioning_steps module_provisioning_steps_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.module_provisioning_steps
    ADD CONSTRAINT module_provisioning_steps_pkey PRIMARY KEY (id);


--
-- Name: notification_preferences notification_preferences_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notification_preferences
    ADD CONSTRAINT notification_preferences_pkey PRIMARY KEY (preference_id);


--
-- Name: notification_preferences notification_preferences_user_id_activity_type_module_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notification_preferences
    ADD CONSTRAINT notification_preferences_user_id_activity_type_module_key UNIQUE (user_id, activity_type, module);


--
-- Name: nudge_feedback nudge_feedback_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nudge_feedback
    ADD CONSTRAINT nudge_feedback_pkey PRIMARY KEY (feedback_id);


--
-- Name: nudges nudges_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nudges
    ADD CONSTRAINT nudges_pkey PRIMARY KEY (nudge_id);


--
-- Name: onboarding_activity_log onboarding_activity_log_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.onboarding_activity_log
    ADD CONSTRAINT onboarding_activity_log_pkey PRIMARY KEY (id);


--
-- Name: onboarding_answer_history onboarding_answer_history_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.onboarding_answer_history
    ADD CONSTRAINT onboarding_answer_history_pkey PRIMARY KEY (id);


--
-- Name: onboarding_answers_legacy_v1 onboarding_answers_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.onboarding_answers_legacy_v1
    ADD CONSTRAINT onboarding_answers_pkey PRIMARY KEY (snapshot_id);


--
-- Name: onboarding_answers onboarding_answers_pkey1; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.onboarding_answers
    ADD CONSTRAINT onboarding_answers_pkey1 PRIMARY KEY (id);


--
-- Name: onboarding_answers onboarding_answers_session_id_question_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.onboarding_answers
    ADD CONSTRAINT onboarding_answers_session_id_question_code_key UNIQUE (session_id, question_code);


--
-- Name: onboarding_attachments onboarding_attachments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.onboarding_attachments
    ADD CONSTRAINT onboarding_attachments_pkey PRIMARY KEY (id);


--
-- Name: onboarding_blockers onboarding_blockers_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.onboarding_blockers
    ADD CONSTRAINT onboarding_blockers_pkey PRIMARY KEY (id);


--
-- Name: onboarding_blockers onboarding_blockers_session_id_blocker_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.onboarding_blockers
    ADD CONSTRAINT onboarding_blockers_session_id_blocker_code_key UNIQUE (session_id, blocker_code);


--
-- Name: _retired_onboarding_compliance_mapping onboarding_compliance_mapping_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public._retired_onboarding_compliance_mapping
    ADD CONSTRAINT onboarding_compliance_mapping_pkey PRIMARY KEY (id);


--
-- Name: _retired_onboarding_config_audit onboarding_config_audit_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public._retired_onboarding_config_audit
    ADD CONSTRAINT onboarding_config_audit_pkey PRIMARY KEY (id);


--
-- Name: _retired_onboarding_dynamic_lookups onboarding_dynamic_lookups_lookup_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public._retired_onboarding_dynamic_lookups
    ADD CONSTRAINT onboarding_dynamic_lookups_lookup_code_key UNIQUE (lookup_code);


--
-- Name: _retired_onboarding_dynamic_lookups onboarding_dynamic_lookups_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public._retired_onboarding_dynamic_lookups
    ADD CONSTRAINT onboarding_dynamic_lookups_pkey PRIMARY KEY (id);


--
-- Name: onboarding_dynamic_lookups onboarding_dynamic_lookups_pkey1; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.onboarding_dynamic_lookups
    ADD CONSTRAINT onboarding_dynamic_lookups_pkey1 PRIMARY KEY (id);


--
-- Name: _retired_onboarding_field_guidance onboarding_field_guidance_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public._retired_onboarding_field_guidance
    ADD CONSTRAINT onboarding_field_guidance_pkey PRIMARY KEY (id);


--
-- Name: onboarding_field_guidance onboarding_field_guidance_pkey1; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.onboarding_field_guidance
    ADD CONSTRAINT onboarding_field_guidance_pkey1 PRIMARY KEY (id);


--
-- Name: onboarding_notifications onboarding_notifications_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.onboarding_notifications
    ADD CONSTRAINT onboarding_notifications_pkey PRIMARY KEY (id);


--
-- Name: onboarding_progress onboarding_progress_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.onboarding_progress
    ADD CONSTRAINT onboarding_progress_pkey PRIMARY KEY (progress_id);


--
-- Name: onboarding_progress onboarding_progress_session_token_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.onboarding_progress
    ADD CONSTRAINT onboarding_progress_session_token_key UNIQUE (session_token);


--
-- Name: onboarding_question_bank onboarding_question_bank_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.onboarding_question_bank
    ADD CONSTRAINT onboarding_question_bank_pkey PRIMARY KEY (id);


--
-- Name: onboarding_question_bank onboarding_question_bank_question_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.onboarding_question_bank
    ADD CONSTRAINT onboarding_question_bank_question_code_key UNIQUE (question_code);


--
-- Name: _retired_onboarding_question_options onboarding_question_options_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public._retired_onboarding_question_options
    ADD CONSTRAINT onboarding_question_options_pkey PRIMARY KEY (id);


--
-- Name: onboarding_question_options onboarding_question_options_pkey1; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.onboarding_question_options
    ADD CONSTRAINT onboarding_question_options_pkey1 PRIMARY KEY (id);


--
-- Name: _retired_onboarding_question_types onboarding_question_types_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public._retired_onboarding_question_types
    ADD CONSTRAINT onboarding_question_types_pkey PRIMARY KEY (id);


--
-- Name: onboarding_question_types onboarding_question_types_pkey1; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.onboarding_question_types
    ADD CONSTRAINT onboarding_question_types_pkey1 PRIMARY KEY (id);


--
-- Name: _retired_onboarding_question_types onboarding_question_types_type_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public._retired_onboarding_question_types
    ADD CONSTRAINT onboarding_question_types_type_code_key UNIQUE (type_code);


--
-- Name: onboarding_question_types onboarding_question_types_type_code_key1; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.onboarding_question_types
    ADD CONSTRAINT onboarding_question_types_type_code_key1 UNIQUE (type_code);


--
-- Name: _retired_onboarding_questions onboarding_questions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public._retired_onboarding_questions
    ADD CONSTRAINT onboarding_questions_pkey PRIMARY KEY (id);


--
-- Name: onboarding_questions onboarding_questions_pkey1; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.onboarding_questions
    ADD CONSTRAINT onboarding_questions_pkey1 PRIMARY KEY (id);


--
-- Name: _retired_onboarding_questions onboarding_questions_question_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public._retired_onboarding_questions
    ADD CONSTRAINT onboarding_questions_question_code_key UNIQUE (question_code);


--
-- Name: onboarding_recommendations onboarding_recommendations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.onboarding_recommendations
    ADD CONSTRAINT onboarding_recommendations_pkey PRIMARY KEY (id);


--
-- Name: onboarding_scores onboarding_scores_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.onboarding_scores
    ADD CONSTRAINT onboarding_scores_pkey PRIMARY KEY (id);


--
-- Name: onboarding_sections onboarding_sections_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.onboarding_sections
    ADD CONSTRAINT onboarding_sections_pkey PRIMARY KEY (id);


--
-- Name: onboarding_sections onboarding_sections_session_id_stage_code_section_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.onboarding_sections
    ADD CONSTRAINT onboarding_sections_session_id_stage_code_section_code_key UNIQUE (session_id, stage_code, section_code);


--
-- Name: onboarding_seed_mappings onboarding_seed_mappings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.onboarding_seed_mappings
    ADD CONSTRAINT onboarding_seed_mappings_pkey PRIMARY KEY (id);


--
-- Name: onboarding_seed_mappings onboarding_seed_mappings_question_code_target_table_target__key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.onboarding_seed_mappings
    ADD CONSTRAINT onboarding_seed_mappings_question_code_target_table_target__key UNIQUE (question_code, target_table, target_column);


--
-- Name: onboarding_sessions onboarding_sessions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.onboarding_sessions
    ADD CONSTRAINT onboarding_sessions_pkey PRIMARY KEY (id);


--
-- Name: onboarding_sessions onboarding_sessions_session_key_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.onboarding_sessions
    ADD CONSTRAINT onboarding_sessions_session_key_key UNIQUE (session_key);


--
-- Name: _retired_onboarding_stage_definitions onboarding_stage_definitions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public._retired_onboarding_stage_definitions
    ADD CONSTRAINT onboarding_stage_definitions_pkey PRIMARY KEY (id);


--
-- Name: onboarding_stage_definitions onboarding_stage_definitions_pkey1; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.onboarding_stage_definitions
    ADD CONSTRAINT onboarding_stage_definitions_pkey1 PRIMARY KEY (id);


--
-- Name: _retired_onboarding_stage_definitions onboarding_stage_definitions_stage_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public._retired_onboarding_stage_definitions
    ADD CONSTRAINT onboarding_stage_definitions_stage_code_key UNIQUE (stage_code);


--
-- Name: onboarding_stage_definitions onboarding_stage_definitions_stage_code_key1; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.onboarding_stage_definitions
    ADD CONSTRAINT onboarding_stage_definitions_stage_code_key1 UNIQUE (stage_code);


--
-- Name: onboarding_stages onboarding_stages_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.onboarding_stages
    ADD CONSTRAINT onboarding_stages_pkey PRIMARY KEY (id);


--
-- Name: onboarding_stages onboarding_stages_session_id_stage_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.onboarding_stages
    ADD CONSTRAINT onboarding_stages_session_id_stage_code_key UNIQUE (session_id, stage_code);


--
-- Name: _retired_onboarding_tenant_overrides onboarding_tenant_overrides_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public._retired_onboarding_tenant_overrides
    ADD CONSTRAINT onboarding_tenant_overrides_pkey PRIMARY KEY (id);


--
-- Name: _retired_onboarding_tenant_overrides onboarding_tenant_overrides_tenant_id_override_type_overrid_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public._retired_onboarding_tenant_overrides
    ADD CONSTRAINT onboarding_tenant_overrides_tenant_id_override_type_overrid_key UNIQUE (tenant_id, override_type, override_key);


--
-- Name: _retired_onboarding_translations onboarding_translations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public._retired_onboarding_translations
    ADD CONSTRAINT onboarding_translations_pkey PRIMARY KEY (id);


--
-- Name: onboarding_translations onboarding_translations_pkey1; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.onboarding_translations
    ADD CONSTRAINT onboarding_translations_pkey1 PRIMARY KEY (id);


--
-- Name: _retired_onboarding_translations onboarding_translations_translation_key_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public._retired_onboarding_translations
    ADD CONSTRAINT onboarding_translations_translation_key_key UNIQUE (translation_key);


--
-- Name: onboarding_translations onboarding_translations_translation_key_key1; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.onboarding_translations
    ADD CONSTRAINT onboarding_translations_translation_key_key1 UNIQUE (translation_key);


--
-- Name: _retired_onboarding_ui_config onboarding_ui_config_config_key_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public._retired_onboarding_ui_config
    ADD CONSTRAINT onboarding_ui_config_config_key_key UNIQUE (config_key);


--
-- Name: onboarding_ui_config onboarding_ui_config_config_key_key1; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.onboarding_ui_config
    ADD CONSTRAINT onboarding_ui_config_config_key_key1 UNIQUE (config_key);


--
-- Name: _retired_onboarding_ui_config onboarding_ui_config_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public._retired_onboarding_ui_config
    ADD CONSTRAINT onboarding_ui_config_pkey PRIMARY KEY (id);


--
-- Name: onboarding_ui_config onboarding_ui_config_pkey1; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.onboarding_ui_config
    ADD CONSTRAINT onboarding_ui_config_pkey1 PRIMARY KEY (id);


--
-- Name: _retired_onboarding_user_answers onboarding_user_answers_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public._retired_onboarding_user_answers
    ADD CONSTRAINT onboarding_user_answers_pkey PRIMARY KEY (id);


--
-- Name: onboarding_user_answers onboarding_user_answers_pkey1; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.onboarding_user_answers
    ADD CONSTRAINT onboarding_user_answers_pkey1 PRIMARY KEY (id);


--
-- Name: ontology_evidence_categories ontology_evidence_categories_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ontology_evidence_categories
    ADD CONSTRAINT ontology_evidence_categories_pkey PRIMARY KEY (id);


--
-- Name: ontology_layers ontology_layers_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ontology_layers
    ADD CONSTRAINT ontology_layers_pkey PRIMARY KEY (id);


--
-- Name: ontology_role_blueprints ontology_role_blueprints_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ontology_role_blueprints
    ADD CONSTRAINT ontology_role_blueprints_pkey PRIMARY KEY (id);


--
-- Name: ontology_scoring_policies ontology_scoring_policies_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ontology_scoring_policies
    ADD CONSTRAINT ontology_scoring_policies_pkey PRIMARY KEY (id);


--
-- Name: org_hierarchy org_hierarchy_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.org_hierarchy
    ADD CONSTRAINT org_hierarchy_pkey PRIMARY KEY (id);


--
-- Name: organization_units organization_units_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.organization_units
    ADD CONSTRAINT organization_units_pkey PRIMARY KEY (id);


--
-- Name: password_reset_tokens password_reset_tokens_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.password_reset_tokens
    ADD CONSTRAINT password_reset_tokens_pkey PRIMARY KEY (token_id);


--
-- Name: payments payments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payments
    ADD CONSTRAINT payments_pkey PRIMARY KEY (payment_id);


--
-- Name: pending_assignment_queue pending_assignment_queue_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pending_assignment_queue
    ADD CONSTRAINT pending_assignment_queue_pkey PRIMARY KEY (queue_id);


--
-- Name: platform_email_approvals platform_email_approvals_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.platform_email_approvals
    ADD CONSTRAINT platform_email_approvals_pkey PRIMARY KEY (approval_id);


--
-- Name: platform_email_approvals platform_email_approvals_tenant_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.platform_email_approvals
    ADD CONSTRAINT platform_email_approvals_tenant_id_key UNIQUE (tenant_id);


--
-- Name: platform_products platform_products_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.platform_products
    ADD CONSTRAINT platform_products_pkey PRIMARY KEY (product_key);


--
-- Name: product_modules product_modules_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_modules
    ADD CONSTRAINT product_modules_pkey PRIMARY KEY (product_key, module_code);


--
-- Name: provisioning_events provisioning_events_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.provisioning_events
    ADD CONSTRAINT provisioning_events_pkey PRIMARY KEY (id);


--
-- Name: provisioning_job_lookup provisioning_job_lookup_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.provisioning_job_lookup
    ADD CONSTRAINT provisioning_job_lookup_pkey PRIMARY KEY (job_id);


--
-- Name: provisioning_jobs provisioning_jobs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.provisioning_jobs
    ADD CONSTRAINT provisioning_jobs_pkey PRIMARY KEY (id);


--
-- Name: _retired_provisioning_step_definitions provisioning_step_definitions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public._retired_provisioning_step_definitions
    ADD CONSTRAINT provisioning_step_definitions_pkey PRIMARY KEY (id);


--
-- Name: provisioning_step_definitions provisioning_step_definitions_pkey1; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.provisioning_step_definitions
    ADD CONSTRAINT provisioning_step_definitions_pkey1 PRIMARY KEY (id);


--
-- Name: _retired_provisioning_step_definitions provisioning_step_definitions_step_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public._retired_provisioning_step_definitions
    ADD CONSTRAINT provisioning_step_definitions_step_code_key UNIQUE (step_code);


--
-- Name: provisioning_step_definitions provisioning_step_definitions_step_code_key1; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.provisioning_step_definitions
    ADD CONSTRAINT provisioning_step_definitions_step_code_key1 UNIQUE (step_code);


--
-- Name: provisioning_steps provisioning_steps_job_id_step_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.provisioning_steps
    ADD CONSTRAINT provisioning_steps_job_id_step_code_key UNIQUE (job_id, step_code);


--
-- Name: provisioning_steps provisioning_steps_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.provisioning_steps
    ADD CONSTRAINT provisioning_steps_pkey PRIMARY KEY (id);


--
-- Name: questionnaires questionnaires_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.questionnaires
    ADD CONSTRAINT questionnaires_pkey PRIMARY KEY (questionnaire_id);


--
-- Name: quotes quotes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.quotes
    ADD CONSTRAINT quotes_pkey PRIMARY KEY (quote_id);


--
-- Name: raci_config raci_config_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.raci_config
    ADD CONSTRAINT raci_config_pkey PRIMARY KEY (id);


--
-- Name: rate_limit_hits rate_limit_hits_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.rate_limit_hits
    ADD CONSTRAINT rate_limit_hits_pkey PRIMARY KEY (key, window_start);


--
-- Name: recent_searches recent_searches_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.recent_searches
    ADD CONSTRAINT recent_searches_pkey PRIMARY KEY (search_id);


--
-- Name: regulator_requests regulator_requests_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.regulator_requests
    ADD CONSTRAINT regulator_requests_pkey PRIMARY KEY (request_id);


--
-- Name: regulator_sector_enforcement regulator_sector_enforcement_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.regulator_sector_enforcement
    ADD CONSTRAINT regulator_sector_enforcement_pkey PRIMARY KEY (id);


--
-- Name: regulator_sector_enforcement regulator_sector_enforcement_regulator_id_sector_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.regulator_sector_enforcement
    ADD CONSTRAINT regulator_sector_enforcement_regulator_id_sector_code_key UNIQUE (regulator_id, sector_code);


--
-- Name: regulators regulators_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.regulators
    ADD CONSTRAINT regulators_pkey PRIMARY KEY (regulator_id);


--
-- Name: regulatory_alerts regulatory_alerts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.regulatory_alerts
    ADD CONSTRAINT regulatory_alerts_pkey PRIMARY KEY (alert_id);


--
-- Name: regulatory_change_log regulatory_change_log_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.regulatory_change_log
    ADD CONSTRAINT regulatory_change_log_pkey PRIMARY KEY (change_id);


--
-- Name: regulatory_controls regulatory_controls_domain_id_control_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.regulatory_controls
    ADD CONSTRAINT regulatory_controls_domain_id_control_code_key UNIQUE (domain_id, control_code);


--
-- Name: regulatory_controls regulatory_controls_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.regulatory_controls
    ADD CONSTRAINT regulatory_controls_pkey PRIMARY KEY (id);


--
-- Name: regulatory_delta_impacts regulatory_delta_impacts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.regulatory_delta_impacts
    ADD CONSTRAINT regulatory_delta_impacts_pkey PRIMARY KEY (impact_id);


--
-- Name: regulatory_deltas regulatory_deltas_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.regulatory_deltas
    ADD CONSTRAINT regulatory_deltas_pkey PRIMARY KEY (delta_id);


--
-- Name: regulatory_frameworks regulatory_frameworks_framework_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.regulatory_frameworks
    ADD CONSTRAINT regulatory_frameworks_framework_code_key UNIQUE (framework_code);


--
-- Name: regulatory_frameworks regulatory_frameworks_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.regulatory_frameworks
    ADD CONSTRAINT regulatory_frameworks_pkey PRIMARY KEY (id);


--
-- Name: report_shares report_shares_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.report_shares
    ADD CONSTRAINT report_shares_pkey PRIMARY KEY (share_id);


--
-- Name: report_shares report_shares_report_id_recipient_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.report_shares
    ADD CONSTRAINT report_shares_report_id_recipient_id_key UNIQUE (report_id, recipient_id);


--
-- Name: risk_categories risk_categories_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.risk_categories
    ADD CONSTRAINT risk_categories_pkey PRIMARY KEY (id);


--
-- Name: risk_categories risk_categories_risk_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.risk_categories
    ADD CONSTRAINT risk_categories_risk_code_key UNIQUE (risk_code);


--
-- Name: risk_control_mappings risk_control_mappings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.risk_control_mappings
    ADD CONSTRAINT risk_control_mappings_pkey PRIMARY KEY (id);


--
-- Name: risk_control_mappings risk_control_mappings_risk_id_control_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.risk_control_mappings
    ADD CONSTRAINT risk_control_mappings_risk_id_control_id_key UNIQUE (risk_id, control_id);


--
-- Name: risk_criteria risk_criteria_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.risk_criteria
    ADD CONSTRAINT risk_criteria_pkey PRIMARY KEY (id);


--
-- Name: risk_pair_reviews risk_pair_reviews_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.risk_pair_reviews
    ADD CONSTRAINT risk_pair_reviews_pkey PRIMARY KEY (review_id);


--
-- Name: risks risks_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.risks
    ADD CONSTRAINT risks_pkey PRIMARY KEY (id);


--
-- Name: risks risks_risk_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.risks
    ADD CONSTRAINT risks_risk_code_key UNIQUE (risk_code);


--
-- Name: roadmap_tasks roadmap_tasks_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.roadmap_tasks
    ADD CONSTRAINT roadmap_tasks_pkey PRIMARY KEY (task_id);


--
-- Name: roadmaps roadmaps_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.roadmaps
    ADD CONSTRAINT roadmaps_pkey PRIMARY KEY (roadmap_id);


--
-- Name: roadmaps roadmaps_tenant_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.roadmaps
    ADD CONSTRAINT roadmaps_tenant_id_key UNIQUE (tenant_id);


--
-- Name: role_function_map role_function_map_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.role_function_map
    ADD CONSTRAINT role_function_map_pkey PRIMARY KEY (id);


--
-- Name: role_functions role_functions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.role_functions
    ADD CONSTRAINT role_functions_pkey PRIMARY KEY (function_code);


--
-- Name: roles roles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.roles
    ADD CONSTRAINT roles_pkey PRIMARY KEY (role_id);


--
-- Name: saved_searches saved_searches_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.saved_searches
    ADD CONSTRAINT saved_searches_pkey PRIMARY KEY (search_id);


--
-- Name: scan_schedules scan_schedules_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.scan_schedules
    ADD CONSTRAINT scan_schedules_pkey PRIMARY KEY (id);


--
-- Name: schema_migrations schema_migrations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.schema_migrations
    ADD CONSTRAINT schema_migrations_pkey PRIMARY KEY (version);


--
-- Name: score_calibrations score_calibrations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.score_calibrations
    ADD CONSTRAINT score_calibrations_pkey PRIMARY KEY (calibration_id);


--
-- Name: search_index_config search_index_config_entity_type_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.search_index_config
    ADD CONSTRAINT search_index_config_entity_type_key UNIQUE (entity_type);


--
-- Name: search_index_config search_index_config_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.search_index_config
    ADD CONSTRAINT search_index_config_pkey PRIMARY KEY (config_id);


--
-- Name: sector_framework sector_framework_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sector_framework
    ADD CONSTRAINT sector_framework_pkey PRIMARY KEY (sector_id, framework_code);


--
-- Name: sector_isic_map sector_isic_map_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sector_isic_map
    ADD CONSTRAINT sector_isic_map_pkey PRIMARY KEY (sector_id, isic_code);


--
-- Name: sector_regulator sector_regulator_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sector_regulator
    ADD CONSTRAINT sector_regulator_pkey PRIMARY KEY (sector_id, regulator_id);


--
-- Name: sector_risks sector_risks_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sector_risks
    ADD CONSTRAINT sector_risks_pkey PRIMARY KEY (id);


--
-- Name: sector_risks sector_risks_sector_code_risk_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sector_risks
    ADD CONSTRAINT sector_risks_sector_code_risk_id_key UNIQUE (sector_code, risk_id);


--
-- Name: sectors sectors_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sectors
    ADD CONSTRAINT sectors_pkey PRIMARY KEY (sector_id);


--
-- Name: seed_history seed_history_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.seed_history
    ADD CONSTRAINT seed_history_pkey PRIMARY KEY (seed_id);


--
-- Name: seeding_depth_config seeding_depth_config_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.seeding_depth_config
    ADD CONSTRAINT seeding_depth_config_pkey PRIMARY KEY (config_id);


--
-- Name: seeding_depth_config seeding_depth_config_tenant_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.seeding_depth_config
    ADD CONSTRAINT seeding_depth_config_tenant_id_key UNIQUE (tenant_id);


--
-- Name: sop_procedures sop_procedures_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sop_procedures
    ADD CONSTRAINT sop_procedures_pkey PRIMARY KEY (sop_id);


--
-- Name: standup_digests standup_digests_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.standup_digests
    ADD CONSTRAINT standup_digests_pkey PRIMARY KEY (digest_id);


--
-- Name: startup_checklists startup_checklists_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.startup_checklists
    ADD CONSTRAINT startup_checklists_pkey PRIMARY KEY (id);


--
-- Name: subscription_audit_log subscription_audit_log_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.subscription_audit_log
    ADD CONSTRAINT subscription_audit_log_pkey PRIMARY KEY (id);


--
-- Name: subscription_change_log subscription_change_log_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.subscription_change_log
    ADD CONSTRAINT subscription_change_log_pkey PRIMARY KEY (change_id);


--
-- Name: subscription_change_requests subscription_change_requests_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.subscription_change_requests
    ADD CONSTRAINT subscription_change_requests_pkey PRIMARY KEY (request_id);


--
-- Name: subscription_extensions subscription_extensions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.subscription_extensions
    ADD CONSTRAINT subscription_extensions_pkey PRIMARY KEY (extension_id);


--
-- Name: subscription_notifications_log subscription_notifications_log_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.subscription_notifications_log
    ADD CONSTRAINT subscription_notifications_log_pkey PRIMARY KEY (notification_id);


--
-- Name: subscriptions subscriptions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.subscriptions
    ADD CONSTRAINT subscriptions_pkey PRIMARY KEY (subscription_id);


--
-- Name: subscriptions subscriptions_tenant_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.subscriptions
    ADD CONSTRAINT subscriptions_tenant_id_key UNIQUE (tenant_id);


--
-- Name: table_system_flags table_system_flags_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.table_system_flags
    ADD CONSTRAINT table_system_flags_pkey PRIMARY KEY (id);


--
-- Name: table_system_flags table_system_flags_schema_name_table_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.table_system_flags
    ADD CONSTRAINT table_system_flags_schema_name_table_name_key UNIQUE (schema_name, table_name);


--
-- Name: team_members team_members_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.team_members
    ADD CONSTRAINT team_members_pkey PRIMARY KEY (team_member_id);


--
-- Name: team_members team_members_team_id_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.team_members
    ADD CONSTRAINT team_members_team_id_user_id_key UNIQUE (team_id, user_id);


--
-- Name: team_recommendations team_recommendations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.team_recommendations
    ADD CONSTRAINT team_recommendations_pkey PRIMARY KEY (recommendation_id);


--
-- Name: team_recommendations team_recommendations_tenant_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.team_recommendations
    ADD CONSTRAINT team_recommendations_tenant_id_key UNIQUE (tenant_id);


--
-- Name: teams teams_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.teams
    ADD CONSTRAINT teams_pkey PRIMARY KEY (team_id);


--
-- Name: teams teams_team_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.teams
    ADD CONSTRAINT teams_team_code_key UNIQUE (team_code);


--
-- Name: telemetry_signals telemetry_signals_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.telemetry_signals
    ADD CONSTRAINT telemetry_signals_pkey PRIMARY KEY (signal_id);


--
-- Name: tenant_blueprints tenant_blueprints_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tenant_blueprints
    ADD CONSTRAINT tenant_blueprints_pkey PRIMARY KEY (id);


--
-- Name: tenant_blueprints tenant_blueprints_tenant_id_version_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tenant_blueprints
    ADD CONSTRAINT tenant_blueprints_tenant_id_version_key UNIQUE (tenant_id, version);


--
-- Name: tenant_module_entitlements tenant_module_entitlements_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tenant_module_entitlements
    ADD CONSTRAINT tenant_module_entitlements_pkey PRIMARY KEY (entitlement_id);


--
-- Name: tenant_module_entitlements tenant_module_entitlements_tenant_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tenant_module_entitlements
    ADD CONSTRAINT tenant_module_entitlements_tenant_id_key UNIQUE (tenant_id);


--
-- Name: tenant_regulatory_impacts tenant_regulatory_impacts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tenant_regulatory_impacts
    ADD CONSTRAINT tenant_regulatory_impacts_pkey PRIMARY KEY (id);


--
-- Name: tenant_regulatory_profile tenant_regulatory_profile_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tenant_regulatory_profile
    ADD CONSTRAINT tenant_regulatory_profile_pkey PRIMARY KEY (id);


--
-- Name: tenant_sectors tenant_sectors_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tenant_sectors
    ADD CONSTRAINT tenant_sectors_pkey PRIMARY KEY (id);


--
-- Name: tenant_sectors tenant_sectors_tenant_id_sector_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tenant_sectors
    ADD CONSTRAINT tenant_sectors_tenant_id_sector_code_key UNIQUE (tenant_id, sector_code);


--
-- Name: tenant_settings tenant_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tenant_settings
    ADD CONSTRAINT tenant_settings_pkey PRIMARY KEY (id);


--
-- Name: tenant_sso_config tenant_sso_config_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tenant_sso_config
    ADD CONSTRAINT tenant_sso_config_pkey PRIMARY KEY (id);


--
-- Name: tenant_usage_snapshots tenant_usage_snapshots_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tenant_usage_snapshots
    ADD CONSTRAINT tenant_usage_snapshots_pkey PRIMARY KEY (snapshot_id);


--
-- Name: tenant_user_memberships tenant_user_memberships_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tenant_user_memberships
    ADD CONSTRAINT tenant_user_memberships_pkey PRIMARY KEY (membership_id);


--
-- Name: tenant_user_memberships tenant_user_memberships_tenant_id_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tenant_user_memberships
    ADD CONSTRAINT tenant_user_memberships_tenant_id_user_id_key UNIQUE (tenant_id, user_id);


--
-- Name: tenants tenants_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tenants
    ADD CONSTRAINT tenants_pkey PRIMARY KEY (tenant_id);


--
-- Name: tenants tenants_tenant_code_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tenants
    ADD CONSTRAINT tenants_tenant_code_unique UNIQUE (tenant_code);


--
-- Name: tier_definitions tier_definitions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tier_definitions
    ADD CONSTRAINT tier_definitions_pkey PRIMARY KEY (tier);


--
-- Name: training_schedules training_schedules_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.training_schedules
    ADD CONSTRAINT training_schedules_pkey PRIMARY KEY (id);


--
-- Name: triage_proposals triage_proposals_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.triage_proposals
    ADD CONSTRAINT triage_proposals_pkey PRIMARY KEY (proposal_id);


--
-- Name: trial_extension_requests trial_extension_requests_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.trial_extension_requests
    ADD CONSTRAINT trial_extension_requests_pkey PRIMARY KEY (request_id);


--
-- Name: approval_chains uk_approval_chain; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.approval_chains
    ADD CONSTRAINT uk_approval_chain UNIQUE (tenant_id, workflow_type, chain_name, level_number);


--
-- Name: audit_findings uk_audit_finding; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_findings
    ADD CONSTRAINT uk_audit_finding UNIQUE (tenant_id, audit_id, finding_ref);


--
-- Name: data_classifications uk_data_classification; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.data_classifications
    ADD CONSTRAINT uk_data_classification UNIQUE (tenant_id, classification_level);


--
-- Name: data_governance_config uk_data_gov_config; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.data_governance_config
    ADD CONSTRAINT uk_data_gov_config UNIQUE (tenant_id, config_area, config_key);


--
-- Name: evidence_config uk_evidence_config; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.evidence_config
    ADD CONSTRAINT uk_evidence_config UNIQUE (tenant_id, evidence_type);


--
-- Name: governance_config uk_governance_config; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.governance_config
    ADD CONSTRAINT uk_governance_config UNIQUE (tenant_id, config_key);


--
-- Name: incident_categories uk_incident_category; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.incident_categories
    ADD CONSTRAINT uk_incident_category UNIQUE (tenant_id, category_code);


--
-- Name: integrations uk_integration; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.integrations
    ADD CONSTRAINT uk_integration UNIQUE (tenant_id, integration_type, integration_name);


--
-- Name: kri_config uk_kri_config; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.kri_config
    ADD CONSTRAINT uk_kri_config UNIQUE (tenant_id, kri_code);


--
-- Name: org_hierarchy uk_org_hierarchy; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.org_hierarchy
    ADD CONSTRAINT uk_org_hierarchy UNIQUE (tenant_id, child_unit_id, parent_unit_id);


--
-- Name: organization_units uk_org_unit; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.organization_units
    ADD CONSTRAINT uk_org_unit UNIQUE (tenant_id, unit_code);


--
-- Name: role_function_map uk_role_function; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.role_function_map
    ADD CONSTRAINT uk_role_function UNIQUE (tenant_id, role_id, function_code);


--
-- Name: lookup_team_framework_mapping uk_team_framework_map; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lookup_team_framework_mapping
    ADD CONSTRAINT uk_team_framework_map UNIQUE (team_function_code, framework_code, framework_section);


--
-- Name: tenant_regulatory_profile uk_tenant_regulatory; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tenant_regulatory_profile
    ADD CONSTRAINT uk_tenant_regulatory UNIQUE (tenant_id);


--
-- Name: tenant_settings uk_tenant_setting; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tenant_settings
    ADD CONSTRAINT uk_tenant_setting UNIQUE (tenant_id, setting_category, setting_key);


--
-- Name: tenant_sso_config uk_tenant_sso; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tenant_sso_config
    ADD CONSTRAINT uk_tenant_sso UNIQUE (tenant_id, provider_type);


--
-- Name: tenants uq_tenants_schema_name; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tenants
    ADD CONSTRAINT uq_tenants_schema_name UNIQUE (schema_name);


--
-- Name: tenants uq_tenants_schema_name_v2; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tenants
    ADD CONSTRAINT uq_tenants_schema_name_v2 UNIQUE (schema_name);


--
-- Name: tenants uq_tenants_tenant_code; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tenants
    ADD CONSTRAINT uq_tenants_tenant_code UNIQUE (tenant_code);


--
-- Name: tenants uq_tenants_tenant_code_v2; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tenants
    ADD CONSTRAINT uq_tenants_tenant_code_v2 UNIQUE (tenant_code);


--
-- Name: usage_snapshots usage_snapshots_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.usage_snapshots
    ADD CONSTRAINT usage_snapshots_pkey PRIMARY KEY (id);


--
-- Name: user_activities user_activities_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_activities
    ADD CONSTRAINT user_activities_pkey PRIMARY KEY (activity_id);


--
-- Name: user_favorites user_favorites_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_favorites
    ADD CONSTRAINT user_favorites_pkey PRIMARY KEY (favorite_id);


--
-- Name: user_favorites user_favorites_user_id_item_type_item_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_favorites
    ADD CONSTRAINT user_favorites_user_id_item_type_item_id_key UNIQUE (user_id, item_type, item_id);


--
-- Name: user_function_overrides user_function_overrides_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_function_overrides
    ADD CONSTRAINT user_function_overrides_pkey PRIMARY KEY (override_id);


--
-- Name: user_mfa user_mfa_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_mfa
    ADD CONSTRAINT user_mfa_pkey PRIMARY KEY (user_id);


--
-- Name: user_preferences user_preferences_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_preferences
    ADD CONSTRAINT user_preferences_pkey PRIMARY KEY (preference_id);


--
-- Name: user_preferences user_preferences_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_preferences
    ADD CONSTRAINT user_preferences_user_id_key UNIQUE (user_id);


--
-- Name: users users_email_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key UNIQUE (email);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (user_id);


--
-- Name: vendor_assessments vendor_assessments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vendor_assessments
    ADD CONSTRAINT vendor_assessments_pkey PRIMARY KEY (id);


--
-- Name: vendor_engagement_scores vendor_engagement_scores_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vendor_engagement_scores
    ADD CONSTRAINT vendor_engagement_scores_pkey PRIMARY KEY (score_id);


--
-- Name: war_rooms war_rooms_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.war_rooms
    ADD CONSTRAINT war_rooms_pkey PRIMARY KEY (war_room_id);


--
-- Name: websocket_event_queue websocket_event_queue_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.websocket_event_queue
    ADD CONSTRAINT websocket_event_queue_pkey PRIMARY KEY (event_id);


--
-- Name: workflow_timeline_entries workflow_timeline_entries_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.workflow_timeline_entries
    ADD CONSTRAINT workflow_timeline_entries_pkey PRIMARY KEY (entry_id);


--
-- Name: workspace_activation_log workspace_activation_log_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.workspace_activation_log
    ADD CONSTRAINT workspace_activation_log_pkey PRIMARY KEY (id);


--
-- Name: workspace_onboarding_links workspace_onboarding_links_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.workspace_onboarding_links
    ADD CONSTRAINT workspace_onboarding_links_pkey PRIMARY KEY (id);


--
-- Name: workspace_onboarding_links workspace_onboarding_links_workspace_id_onboarding_session__key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.workspace_onboarding_links
    ADD CONSTRAINT workspace_onboarding_links_workspace_id_onboarding_session__key UNIQUE (workspace_id, onboarding_session_id);


--
-- Name: workspace_profile workspace_profile_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.workspace_profile
    ADD CONSTRAINT workspace_profile_pkey PRIMARY KEY (workspace_profile_id);


--
-- Name: idx_acm_agent; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_acm_agent ON public.agent_collaboration_metrics USING btree (agent_user_id, snapshot_at DESC);


--
-- Name: idx_act_notif_activity; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_act_notif_activity ON public.activity_notifications USING btree (activity_id);


--
-- Name: idx_act_notif_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_act_notif_user ON public.activity_notifications USING btree (user_id, read, created_at DESC);


--
-- Name: idx_activity_feed_action; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_activity_feed_action ON public.activity_feed USING btree (action, created_at DESC);


--
-- Name: idx_activity_feed_archived; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_activity_feed_archived ON public.activity_feed USING btree (user_id, archived) WHERE (archived = false);


--
-- Name: idx_activity_feed_entity; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_activity_feed_entity ON public.activity_feed USING btree (entity_type, entity_id);


--
-- Name: idx_activity_feed_module; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_activity_feed_module ON public.activity_feed USING btree (module, created_at DESC);


--
-- Name: idx_activity_feed_read; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_activity_feed_read ON public.activity_feed USING btree (user_id, read) WHERE (read = false);


--
-- Name: idx_activity_feed_snoozed; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_activity_feed_snoozed ON public.activity_feed USING btree (snoozed_until) WHERE (snoozed_until IS NOT NULL);


--
-- Name: idx_activity_feed_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_activity_feed_user ON public.activity_feed USING btree (user_id, created_at DESC);


--
-- Name: idx_agent_perf_agent; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_agent_perf_agent ON public.agent_performance USING btree (agent_id, executed_at DESC);


--
-- Name: idx_agent_registry_product; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_agent_registry_product ON public.agent_registry USING btree (product_key);


--
-- Name: idx_agrc_event_severity; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_agrc_event_severity ON public.agrc_event_log USING btree (severity, created_at DESC);


--
-- Name: idx_agrc_event_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_agrc_event_type ON public.agrc_event_log USING btree (event_type, created_at DESC);


--
-- Name: idx_ai_agent_status_agent; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ai_agent_status_agent ON public.ai_agent_status_log USING btree (agent_user_id, created_at DESC);


--
-- Name: idx_ai_sessions_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ai_sessions_user ON public.ai_sessions USING btree (user_id, updated_at DESC);


--
-- Name: idx_ai_step_exec_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ai_step_exec_status ON public.ai_step_executions USING btree (status);


--
-- Name: idx_ai_step_exec_workflow; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ai_step_exec_workflow ON public.ai_step_executions USING btree (workflow_execution_id);


--
-- Name: idx_ai_step_feedback_workflow; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ai_step_feedback_workflow ON public.ai_step_feedback USING btree (workflow_id);


--
-- Name: idx_answer_history_session; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_answer_history_session ON public.onboarding_answer_history USING btree (session_id);


--
-- Name: idx_applicability_sector; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_applicability_sector ON public.applicability_explanations USING btree (sector_id);


--
-- Name: idx_applicability_type_ref; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_applicability_type_ref ON public.applicability_explanations USING btree (object_type, ref_code);


--
-- Name: idx_approval_chains_entity_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_approval_chains_entity_type ON public.approval_chains USING btree (entity_type) WHERE (active = true);


--
-- Name: idx_approval_chains_tenant; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_approval_chains_tenant ON public.approval_chains USING btree (tenant_id);


--
-- Name: idx_approval_chains_workflow; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_approval_chains_workflow ON public.approval_chains USING btree (workflow_type);


--
-- Name: idx_approval_decisions_approval; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_approval_decisions_approval ON public.approval_decisions USING btree (approval_id);


--
-- Name: idx_approval_entity; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_approval_entity ON public.approval_requests USING btree (entity_type, entity_id);


--
-- Name: idx_approval_requests_submitted_by; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_approval_requests_submitted_by ON public.approval_requests USING btree (submitted_by) WHERE (submitted_by IS NOT NULL);


--
-- Name: idx_approval_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_approval_status ON public.approval_requests USING btree (status);


--
-- Name: idx_approval_steps_log_request; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_approval_steps_log_request ON public.approval_steps_log USING btree (request_id);


--
-- Name: idx_as_target; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_as_target ON public.agent_suggestions USING btree (target_user_id, created_at DESC);


--
-- Name: idx_asl_agent; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_asl_agent ON public.agent_status_log USING btree (agent_user_id, created_at DESC);


--
-- Name: idx_audit_findings_severity; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_audit_findings_severity ON public.audit_findings USING btree (severity);


--
-- Name: idx_audit_findings_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_audit_findings_status ON public.audit_findings USING btree (status);


--
-- Name: idx_audit_findings_tenant; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_audit_findings_tenant ON public.audit_findings USING btree (tenant_id);


--
-- Name: idx_audit_schedules_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_audit_schedules_status ON public.audit_schedules USING btree (status);


--
-- Name: idx_audit_schedules_tenant; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_audit_schedules_tenant ON public.audit_schedules USING btree (tenant_id);


--
-- Name: idx_audit_schedules_year; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_audit_schedules_year ON public.audit_schedules USING btree (schedule_year);


--
-- Name: idx_auth_audit_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_auth_audit_created_at ON public.authorization_audit_log USING btree (created_at DESC);


--
-- Name: idx_auth_audit_decision; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_auth_audit_decision ON public.authorization_audit_log USING btree (decision);


--
-- Name: idx_auth_audit_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_auth_audit_user ON public.authorization_audit_log USING btree (user_id);


--
-- Name: idx_auth_frameworks; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_auth_frameworks ON public.lookup_authority_frameworks USING btree (authority_code);


--
-- Name: idx_auth_mismatch_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_auth_mismatch_created_at ON public.authorization_mismatch_log USING btree (created_at DESC);


--
-- Name: idx_auth_mismatch_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_auth_mismatch_user ON public.authorization_mismatch_log USING btree (user_id);


--
-- Name: idx_auth_sector_mapping; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_auth_sector_mapping ON public.lookup_authority_sector_mapping USING btree (authority_code, sector_code);


--
-- Name: idx_authorities_acronym; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_authorities_acronym ON public.lookup_ksa_regulatory_authorities USING btree (authority_acronym);


--
-- Name: idx_authorities_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_authorities_type ON public.lookup_ksa_regulatory_authorities USING btree (authority_type);


--
-- Name: idx_bcp_config_criticality; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_bcp_config_criticality ON public.bcp_config USING btree (criticality_tier);


--
-- Name: idx_bcp_config_tenant; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_bcp_config_tenant ON public.bcp_config USING btree (tenant_id);


--
-- Name: idx_ccm_source; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ccm_source ON public.control_cross_mappings USING btree (source_control_code) WHERE (source_control_code IS NOT NULL);


--
-- Name: idx_ccm_target; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ccm_target ON public.control_cross_mappings USING btree (target_control_code) WHERE (target_control_code IS NOT NULL);


--
-- Name: idx_change_log_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_change_log_created ON public.change_log USING btree (created_at);


--
-- Name: idx_change_log_key; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_change_log_key ON public.change_log USING btree (record_key);


--
-- Name: idx_change_log_table; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_change_log_table ON public.change_log USING btree (table_name);


--
-- Name: idx_checkpoints_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_checkpoints_status ON public.lifecycle_checkpoints USING btree (status, scheduled_at);


--
-- Name: idx_checkpoints_tenant; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_checkpoints_tenant ON public.lifecycle_checkpoints USING btree (tenant_id, checkpoint_type);


--
-- Name: idx_cities_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_cities_active ON public._retired_lookup_cities USING btree (is_active) WHERE (is_active = true);


--
-- Name: idx_cities_code; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_cities_code ON public._retired_lookup_cities USING btree (city_code);


--
-- Name: idx_cities_country; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_cities_country ON public._retired_lookup_cities USING btree (country_code);


--
-- Name: idx_cities_major; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_cities_major ON public._retired_lookup_cities USING btree (is_major_city) WHERE (is_major_city = true);


--
-- Name: idx_cities_name_en; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_cities_name_en ON public._retired_lookup_cities USING btree (city_name_en);


--
-- Name: idx_cities_province; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_cities_province ON public.lookup_ksa_cities USING btree (province_code);


--
-- Name: idx_cities_search_ar; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_cities_search_ar ON public._retired_lookup_cities USING gin (to_tsvector('arabic'::regconfig, (city_name_ar)::text));


--
-- Name: idx_cities_search_en; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_cities_search_en ON public._retired_lookup_cities USING gin (to_tsvector('english'::regconfig, (city_name_en)::text));


--
-- Name: idx_cities_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_cities_type ON public.lookup_ksa_cities USING btree (city_type);


--
-- Name: idx_cmd_palette_key; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_cmd_palette_key ON public.command_palette_history USING btree (command_key);


--
-- Name: idx_cmd_palette_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_cmd_palette_user ON public.command_palette_history USING btree (user_id, usage_count DESC);


--
-- Name: idx_cmd_palette_user_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX idx_cmd_palette_user_key ON public.command_palette_history USING btree (user_id, command_key);


--
-- Name: idx_command_history_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_command_history_user ON public.command_history USING btree (user_id, usage_count DESC);


--
-- Name: idx_compliance_criticality; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_compliance_criticality ON public._retired_onboarding_compliance_mapping USING btree (criticality);


--
-- Name: idx_compliance_framework; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_compliance_framework ON public._retired_onboarding_compliance_mapping USING btree (framework_code);


--
-- Name: idx_compliance_mappings_source; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_compliance_mappings_source ON public.compliance_mappings USING btree (source_framework, source_control_id);


--
-- Name: idx_compliance_mappings_target; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_compliance_mappings_target ON public.compliance_mappings USING btree (target_framework, target_control_id);


--
-- Name: idx_compliance_mappings_tenant; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_compliance_mappings_tenant ON public.compliance_mappings USING btree (tenant_id);


--
-- Name: idx_compliance_question; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_compliance_question ON public._retired_onboarding_compliance_mapping USING btree (question_id);


--
-- Name: idx_config_audit_action; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_config_audit_action ON public._retired_onboarding_config_audit USING btree (action);


--
-- Name: idx_config_audit_changed_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_config_audit_changed_at ON public._retired_onboarding_config_audit USING btree (changed_at);


--
-- Name: idx_config_audit_record; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_config_audit_record ON public._retired_onboarding_config_audit USING btree (record_id);


--
-- Name: idx_config_audit_table; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_config_audit_table ON public._retired_onboarding_config_audit USING btree (table_name);


--
-- Name: idx_config_sources_tenant; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_config_sources_tenant ON public.config_entry_sources USING btree (tenant_id, config_section);


--
-- Name: idx_control_reg_control; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_control_reg_control ON public.control_regulator_mapping USING btree (control_id);


--
-- Name: idx_control_reg_regulator; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_control_reg_regulator ON public.control_regulator_mapping USING btree (regulator_id);


--
-- Name: idx_control_reg_sectors; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_control_reg_sectors ON public.control_regulator_mapping USING gin (applicable_sectors);


--
-- Name: idx_control_sectors_applicability; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_control_sectors_applicability ON public.control_sectors USING btree (applicability);


--
-- Name: idx_control_sectors_control; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_control_sectors_control ON public.control_sectors USING btree (control_id);


--
-- Name: idx_control_sectors_sector; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_control_sectors_sector ON public.control_sectors USING btree (sector_code);


--
-- Name: idx_countries_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_countries_active ON public._retired_lookup_countries USING btree (is_active) WHERE (is_active = true);


--
-- Name: idx_countries_code; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_countries_code ON public._retired_lookup_countries USING btree (country_code);


--
-- Name: idx_countries_name_en; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_countries_name_en ON public._retired_lookup_countries USING btree (name_en);


--
-- Name: idx_cross_mappings_source; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_cross_mappings_source ON public.cross_mappings USING btree (source_node_id);


--
-- Name: idx_cross_mappings_target; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_cross_mappings_target ON public.cross_mappings USING btree (target_node_id);


--
-- Name: idx_ctx_suggestions_entity; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ctx_suggestions_entity ON public.contextual_suggestions USING btree (entity_type, entity_id);


--
-- Name: idx_ctx_suggestions_page; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ctx_suggestions_page ON public.contextual_suggestions USING btree (page_context, active);


--
-- Name: idx_data_classifications_tenant; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_data_classifications_tenant ON public.data_classifications USING btree (tenant_id);


--
-- Name: idx_data_gov_config_area; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_data_gov_config_area ON public.data_governance_config USING btree (config_area);


--
-- Name: idx_data_gov_config_tenant; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_data_gov_config_tenant ON public.data_governance_config USING btree (tenant_id);


--
-- Name: idx_data_sources_table; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_data_sources_table ON public.lookup_data_sources USING btree (table_name);


--
-- Name: idx_dept_roles_dept; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_dept_roles_dept ON public.department_roles USING btree (department_id);


--
-- Name: idx_dept_roles_tenant; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_dept_roles_tenant ON public.department_roles USING btree (tenant_id);


--
-- Name: idx_dynamic_lookups_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_dynamic_lookups_active ON public._retired_onboarding_dynamic_lookups USING btree (is_active) WHERE (is_active = true);


--
-- Name: idx_dynamic_lookups_category; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_dynamic_lookups_category ON public._retired_onboarding_dynamic_lookups USING btree (category);


--
-- Name: idx_dynamic_lookups_code; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_dynamic_lookups_code ON public._retired_onboarding_dynamic_lookups USING btree (lookup_code);


--
-- Name: idx_dynamic_lookups_parent; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_dynamic_lookups_parent ON public._retired_onboarding_dynamic_lookups USING btree (parent_lookup_code);


--
-- Name: idx_efm_connection; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_efm_connection ON public.erp_field_mappings USING btree (connection_id);


--
-- Name: idx_email_verification_token; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_email_verification_token ON public.email_verification_tokens USING btree (token);


--
-- Name: idx_emp_ranges_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_emp_ranges_active ON public._retired_lookup_employee_ranges USING btree (is_active) WHERE (is_active = true);


--
-- Name: idx_emp_ranges_code; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_emp_ranges_code ON public._retired_lookup_employee_ranges USING btree (range_code);


--
-- Name: idx_entity_links_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_entity_links_created_at ON public.entity_links USING btree (created_at DESC);


--
-- Name: idx_entity_links_created_by; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_entity_links_created_by ON public.entity_links USING btree (created_by);


--
-- Name: idx_entity_links_relationship; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_entity_links_relationship ON public.entity_links USING btree (relationship_type);


--
-- Name: idx_entity_links_source; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_entity_links_source ON public.entity_links USING btree (source_type, source_id);


--
-- Name: idx_entity_links_target; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_entity_links_target ON public.entity_links USING btree (target_type, target_id);


--
-- Name: idx_escalation_rules_tenant; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_escalation_rules_tenant ON public.escalation_rules USING btree (tenant_id);


--
-- Name: idx_escalation_rules_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_escalation_rules_type ON public.escalation_rules USING btree (rule_type);


--
-- Name: idx_esh_connection; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_esh_connection ON public.erp_sync_history USING btree (connection_id, started_at DESC);


--
-- Name: idx_event_type_ns; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_event_type_ns ON public.event_type_registry USING btree (namespace);


--
-- Name: idx_event_type_product; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_event_type_product ON public.event_type_registry USING btree (product_key);


--
-- Name: idx_evidence_config_tenant; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_evidence_config_tenant ON public.evidence_config USING btree (tenant_id);


--
-- Name: idx_evidence_relay_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_evidence_relay_status ON public.evidence_relay_queue USING btree (status, created_at DESC);


--
-- Name: idx_evidence_req_control; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_evidence_req_control ON public.control_evidence_requirements USING btree (control_id);


--
-- Name: idx_evidence_req_mandatory; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_evidence_req_mandatory ON public.control_evidence_requirements USING btree (is_mandatory);


--
-- Name: idx_evidence_req_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_evidence_req_type ON public.control_evidence_requirements USING btree (evidence_type_code);


--
-- Name: idx_exception_mgmt_dates; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_exception_mgmt_dates ON public.exception_management USING btree (end_date);


--
-- Name: idx_exception_mgmt_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_exception_mgmt_status ON public.exception_management USING btree (status);


--
-- Name: idx_exception_mgmt_tenant; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_exception_mgmt_tenant ON public.exception_management USING btree (tenant_id);


--
-- Name: idx_exec_plan_tenant; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_exec_plan_tenant ON public.execution_plan_snapshots USING btree (tenant_id, created_at DESC);


--
-- Name: idx_field_guidance_qid; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_field_guidance_qid ON public.onboarding_field_guidance USING btree (question_id);


--
-- Name: idx_framework_alias_fwcode; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_framework_alias_fwcode ON public.framework_alias USING btree (framework_code);


--
-- Name: idx_framework_version_diffs_framework; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_framework_version_diffs_framework ON public.framework_version_diffs USING btree (framework_code);


--
-- Name: idx_framework_version_diffs_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_framework_version_diffs_type ON public.framework_version_diffs USING btree (change_type);


--
-- Name: idx_framework_version_diffs_versions; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_framework_version_diffs_versions ON public.framework_version_diffs USING btree (framework_code, from_version, to_version);


--
-- Name: idx_frameworks_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_frameworks_active ON public._retired_lookup_frameworks USING btree (is_active) WHERE (is_active = true);


--
-- Name: idx_frameworks_code; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_frameworks_code ON public._retired_lookup_frameworks USING btree (framework_code);


--
-- Name: idx_frameworks_compliance; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_frameworks_compliance ON public._retired_lookup_frameworks USING btree (compliance_level);


--
-- Name: idx_func_auth_function; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_func_auth_function ON public.function_authorities USING btree (function_code);


--
-- Name: idx_func_auth_lookup; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_func_auth_lookup ON public.function_authorities USING btree (function_code, action, resource_type);


--
-- Name: idx_func_auth_resource; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_func_auth_resource ON public.function_authorities USING btree (resource_type);


--
-- Name: idx_governance_config_category; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_governance_config_category ON public.governance_config USING btree (category);


--
-- Name: idx_governance_config_tenant; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_governance_config_tenant ON public.governance_config USING btree (tenant_id);


--
-- Name: idx_grc_role_staffing_range; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_grc_role_staffing_range ON public.lookup_grc_role_staffing USING btree (range_code);


--
-- Name: idx_grc_role_staffing_sector; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_grc_role_staffing_sector ON public.lookup_grc_role_staffing USING btree (sector_code);


--
-- Name: idx_guidance_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_guidance_active ON public._retired_onboarding_field_guidance USING btree (is_active) WHERE (is_active = true);


--
-- Name: idx_guidance_field; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_guidance_field ON public._retired_onboarding_field_guidance USING btree (field_name);


--
-- Name: idx_guidance_question; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_guidance_question ON public._retired_onboarding_field_guidance USING btree (question_id);


--
-- Name: idx_guidance_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_guidance_type ON public._retired_onboarding_field_guidance USING btree (guidance_type);


--
-- Name: idx_hl_task; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_hl_task ON public.handoff_log USING btree (task_id);


--
-- Name: idx_ial_admin; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ial_admin ON public.intervention_audit_log USING btree (admin_user_id, created_at DESC);


--
-- Name: idx_ial_workflow; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ial_workflow ON public.intervention_audit_log USING btree (workflow_step_id);


--
-- Name: idx_incident_categories_tenant; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_incident_categories_tenant ON public.incident_categories USING btree (tenant_id);


--
-- Name: idx_inline_edit_entity; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_inline_edit_entity ON public.inline_edit_history USING btree (entity_type, entity_id, created_at DESC);


--
-- Name: idx_inline_edit_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_inline_edit_user ON public.inline_edit_history USING btree (edited_by, created_at DESC);


--
-- Name: idx_instrument_structure_instrument; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_instrument_structure_instrument ON public.instrument_structure USING btree (instrument_id);


--
-- Name: idx_instrument_structure_parent; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_instrument_structure_parent ON public.instrument_structure USING btree (parent_node_id);


--
-- Name: idx_instruments_regulator; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_instruments_regulator ON public.instruments USING btree (regulator_id);


--
-- Name: idx_integrations_tenant; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_integrations_tenant ON public.integrations USING btree (tenant_id);


--
-- Name: idx_integrations_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_integrations_type ON public.integrations USING btree (integration_type);


--
-- Name: idx_isic4_code; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_isic4_code ON public.lookup_isic4_sectors USING btree (section_code);


--
-- Name: idx_isic_risks_risk; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_isic_risks_risk ON public.isic_risks USING btree (risk_id);


--
-- Name: idx_job_executions_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_job_executions_status ON public.job_executions USING btree (status, started_at DESC);


--
-- Name: idx_journey_state_tenant; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_journey_state_tenant ON public.journey_state USING btree (tenant_id);


--
-- Name: idx_kri_config_category; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_kri_config_category ON public.kri_config USING btree (risk_category);


--
-- Name: idx_kri_config_tenant; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_kri_config_tenant ON public.kri_config USING btree (tenant_id);


--
-- Name: idx_languages_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_languages_active ON public._retired_lookup_languages USING btree (is_active) WHERE (is_active = true);


--
-- Name: idx_languages_code; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_languages_code ON public._retired_lookup_languages USING btree (language_code);


--
-- Name: idx_languages_primary; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_languages_primary ON public._retired_lookup_languages USING btree (is_primary) WHERE (is_primary = true);


--
-- Name: idx_lead_captures_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_lead_captures_type ON public.lead_captures USING btree (lead_type, created_at DESC);


--
-- Name: idx_lgcp_thread_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_lgcp_thread_created ON public.langgraph_checkpoints USING btree (thread_id, created_at DESC);


--
-- Name: idx_link_metadata_link; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_link_metadata_link ON public.entity_link_metadata USING btree (link_id);


--
-- Name: idx_login_attempts_email_time; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_login_attempts_email_time ON public.login_attempts USING btree (email, attempted_at DESC) WHERE (success = false);


--
-- Name: idx_manifest_cache_expires; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_manifest_cache_expires ON public.manifest_cache USING btree (expires_at);


--
-- Name: idx_manifest_snap_hash; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_manifest_snap_hash ON public.manifest_snapshots USING btree (manifest_hash);


--
-- Name: idx_manifest_snap_tenant; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_manifest_snap_tenant ON public.manifest_snapshots USING btree (tenant_id, created_at DESC);


--
-- Name: idx_maturity_assessments_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_maturity_assessments_date ON public.maturity_assessments USING btree (assessment_date);


--
-- Name: idx_maturity_assessments_tenant; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_maturity_assessments_tenant ON public.maturity_assessments USING btree (tenant_id);


--
-- Name: idx_maturity_questions_cat; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_maturity_questions_cat ON public.maturity_questions USING btree (category, sort_order);


--
-- Name: idx_maturity_snapshots_tenant; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_maturity_snapshots_tenant ON public.maturity_snapshots USING btree (tenant_id, computed_at DESC);


--
-- Name: idx_migration_config_tenant; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_migration_config_tenant ON public.migration_config USING btree (tenant_id);


--
-- Name: idx_migration_config_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_migration_config_type ON public.migration_config USING btree (migration_type);


--
-- Name: idx_misalignment_tenant; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_misalignment_tenant ON public.engagement_misalignment USING btree (tenant_id, status);


--
-- Name: idx_module_activation_tenant; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_module_activation_tenant ON public.module_activation_requests USING btree (tenant_id, module_code);


--
-- Name: idx_notif_prefs_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_notif_prefs_user ON public.notification_preferences USING btree (user_id) WHERE (user_id IS NOT NULL);


--
-- Name: idx_notification_preferences_activity_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_notification_preferences_activity_type ON public.notification_preferences USING btree (activity_type);


--
-- Name: idx_notification_preferences_enabled; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_notification_preferences_enabled ON public.notification_preferences USING btree (user_id, enabled) WHERE (enabled = true);


--
-- Name: idx_notification_preferences_module; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_notification_preferences_module ON public.notification_preferences USING btree (module);


--
-- Name: idx_notification_preferences_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_notification_preferences_user ON public.notification_preferences USING btree (user_id);


--
-- Name: idx_nudges_dismissed; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_nudges_dismissed ON public.nudges USING btree (tenant_id, dismissed);


--
-- Name: idx_nudges_tenant_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_nudges_tenant_user ON public.nudges USING btree (tenant_id, user_id);


--
-- Name: idx_onb_answer_history_tenant_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_onb_answer_history_tenant_id ON public.onboarding_answer_history USING btree (tenant_id);


--
-- Name: idx_onb_answers_session; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_onb_answers_session ON public.onboarding_answers USING btree (session_id);


--
-- Name: idx_onb_answers_tenant_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_onb_answers_tenant_id ON public.onboarding_answers USING btree (tenant_id);


--
-- Name: idx_onb_blockers_session; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_onb_blockers_session ON public.onboarding_blockers USING btree (session_id);


--
-- Name: idx_onb_question_bank_stage; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_onb_question_bank_stage ON public.onboarding_question_bank USING btree (stage_code, section_code);


--
-- Name: idx_onb_recommendations_session; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_onb_recommendations_session ON public.onboarding_recommendations USING btree (session_id);


--
-- Name: idx_onb_scores_session; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_onb_scores_session ON public.onboarding_scores USING btree (session_id);


--
-- Name: idx_onb_sessions_started_by; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_onb_sessions_started_by ON public.onboarding_sessions USING btree (started_by_user_id);


--
-- Name: idx_onb_sessions_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_onb_sessions_status ON public.onboarding_sessions USING btree (status);


--
-- Name: idx_onb_stages_session; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_onb_stages_session ON public.onboarding_stages USING btree (session_id);


--
-- Name: idx_onboarding_activity_session; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_onboarding_activity_session ON public.onboarding_activity_log USING btree (session_id);


--
-- Name: idx_onboarding_activity_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_onboarding_activity_type ON public.onboarding_activity_log USING btree (activity_type);


--
-- Name: idx_onboarding_activity_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_onboarding_activity_user ON public.onboarding_activity_log USING btree (user_id);


--
-- Name: idx_onboarding_answers_tenant; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_onboarding_answers_tenant ON public.onboarding_answers_legacy_v1 USING btree (tenant_id, version DESC);


--
-- Name: idx_onboarding_answers_trigger; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_onboarding_answers_trigger ON public.onboarding_answers_legacy_v1 USING btree (tenant_id, trigger_type);


--
-- Name: idx_onboarding_attachments_session; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_onboarding_attachments_session ON public.onboarding_attachments USING btree (session_id);


--
-- Name: idx_onboarding_notifications_session; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_onboarding_notifications_session ON public.onboarding_notifications USING btree (session_id);


--
-- Name: idx_onboarding_notifications_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_onboarding_notifications_user ON public.onboarding_notifications USING btree (user_id);


--
-- Name: idx_onboarding_progress_expires; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_onboarding_progress_expires ON public.onboarding_progress USING btree (expires_at);


--
-- Name: idx_onboarding_progress_session; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_onboarding_progress_session ON public.onboarding_progress USING btree (session_token);


--
-- Name: idx_onboarding_progress_tenant_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_onboarding_progress_tenant_user ON public.onboarding_progress USING btree (tenant_id, user_id) WHERE (tenant_id IS NOT NULL);


--
-- Name: idx_onboarding_question_bank_child_fields_gin; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_onboarding_question_bank_child_fields_gin ON public.onboarding_question_bank USING gin (child_fields_json);


--
-- Name: idx_onboarding_question_bank_signals_gin; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_onboarding_question_bank_signals_gin ON public.onboarding_question_bank USING gin (signals);


--
-- Name: idx_onboarding_questions_code; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_onboarding_questions_code ON public.onboarding_questions USING btree (question_code);


--
-- Name: idx_onboarding_questions_stage; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_onboarding_questions_stage ON public.onboarding_questions USING btree (stage_code);


--
-- Name: idx_org_hierarchy_child; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_org_hierarchy_child ON public.org_hierarchy USING btree (child_unit_id);


--
-- Name: idx_org_hierarchy_parent; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_org_hierarchy_parent ON public.org_hierarchy USING btree (parent_unit_id);


--
-- Name: idx_org_hierarchy_tenant; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_org_hierarchy_tenant ON public.org_hierarchy USING btree (tenant_id);


--
-- Name: idx_org_units_parent; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_org_units_parent ON public.organization_units USING btree (parent_unit_id);


--
-- Name: idx_org_units_tenant; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_org_units_tenant ON public.organization_units USING btree (tenant_id);


--
-- Name: idx_org_units_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_org_units_type ON public.organization_units USING btree (unit_type);


--
-- Name: idx_paq_instance; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_paq_instance ON public.pending_assignment_queue USING btree (instance_id, status);


--
-- Name: idx_password_reset_hash; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_password_reset_hash ON public.password_reset_tokens USING btree (token_hash) WHERE (used = false);


--
-- Name: idx_password_reset_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_password_reset_user ON public.password_reset_tokens USING btree (user_id, expires_at) WHERE (used = false);


--
-- Name: idx_payments_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_payments_created ON public.payments USING btree (created_at DESC);


--
-- Name: idx_payments_ext_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_payments_ext_id ON public.payments USING btree (external_payment_id);


--
-- Name: idx_payments_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_payments_status ON public.payments USING btree (status);


--
-- Name: idx_payments_subscription; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_payments_subscription ON public.payments USING btree (subscription_id);


--
-- Name: idx_payments_tenant; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_payments_tenant ON public.payments USING btree (tenant_id, created_at DESC);


--
-- Name: idx_platform_email_approvals_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_platform_email_approvals_status ON public.platform_email_approvals USING btree (status);


--
-- Name: idx_product_modules_code; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_product_modules_code ON public.product_modules USING btree (module_code);


--
-- Name: idx_product_modules_tier; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_product_modules_tier ON public.product_modules USING btree (tier_gate) WHERE (tier_gate IS NOT NULL);


--
-- Name: idx_product_modules_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_product_modules_type ON public.product_modules USING btree (product_key, module_type);


--
-- Name: idx_prov_events_job; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_prov_events_job ON public.provisioning_events USING btree (job_id);


--
-- Name: idx_prov_jobs_session; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_prov_jobs_session ON public.provisioning_jobs USING btree (session_id);


--
-- Name: idx_prov_step_defs_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_prov_step_defs_active ON public._retired_provisioning_step_definitions USING btree (is_active) WHERE (is_active = true);


--
-- Name: idx_prov_step_defs_code; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_prov_step_defs_code ON public._retired_provisioning_step_definitions USING btree (step_code);


--
-- Name: idx_prov_step_defs_seq; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_prov_step_defs_seq ON public._retired_provisioning_step_definitions USING btree (sequence_no);


--
-- Name: idx_prov_steps_job; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_prov_steps_job ON public.provisioning_steps USING btree (job_id);


--
-- Name: idx_provinces_code; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_provinces_code ON public.lookup_ksa_provinces USING btree (province_code);


--
-- Name: idx_provisioning_job_lookup_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_provisioning_job_lookup_created ON public.provisioning_job_lookup USING btree (created_at);


--
-- Name: idx_qbank_module; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_qbank_module ON public.onboarding_question_bank USING btree (module_code);


--
-- Name: idx_qbank_product; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_qbank_product ON public.onboarding_question_bank USING btree (product_key);


--
-- Name: idx_question_options_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_question_options_active ON public._retired_onboarding_question_options USING btree (is_active) WHERE (is_active = true);


--
-- Name: idx_question_options_qid; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_question_options_qid ON public.onboarding_question_options USING btree (question_id);


--
-- Name: idx_question_options_question; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_question_options_question ON public._retired_onboarding_question_options USING btree (question_id);


--
-- Name: idx_question_options_unique; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX idx_question_options_unique ON public._retired_onboarding_question_options USING btree (question_id, option_code);


--
-- Name: idx_questionnaires_vendor; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_questionnaires_vendor ON public.questionnaires USING btree (vendor_id, status);


--
-- Name: idx_questions_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_questions_active ON public._retired_onboarding_questions USING btree (is_active) WHERE (is_active = true);


--
-- Name: idx_questions_group; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_questions_group ON public._retired_onboarding_questions USING btree (display_group);


--
-- Name: idx_questions_order; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_questions_order ON public._retired_onboarding_questions USING btree (stage_code, display_order);


--
-- Name: idx_questions_stage; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_questions_stage ON public._retired_onboarding_questions USING btree (stage_code);


--
-- Name: idx_questions_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_questions_type ON public._retired_onboarding_questions USING btree (question_type_id);


--
-- Name: idx_ra_authority; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ra_authority ON public.regulatory_alerts USING btree (authority_code);


--
-- Name: idx_ra_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ra_created ON public.regulatory_alerts USING btree (created_at DESC);


--
-- Name: idx_ra_urgency; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ra_urgency ON public.regulatory_alerts USING btree (urgency);


--
-- Name: idx_raci_config_process; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_raci_config_process ON public.raci_config USING btree (process_name);


--
-- Name: idx_raci_config_tenant; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_raci_config_tenant ON public.raci_config USING btree (tenant_id);


--
-- Name: idx_rate_limit_updated; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_rate_limit_updated ON public.rate_limit_hits USING btree (updated_at);


--
-- Name: idx_rc_search; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_rc_search ON public.regulatory_controls USING gin (search_vector);


--
-- Name: idx_rcl_effective; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_rcl_effective ON public.regulatory_change_log USING btree (effective_date DESC);


--
-- Name: idx_rcl_framework; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_rcl_framework ON public.regulatory_change_log USING btree (framework_code);


--
-- Name: idx_rcl_pending; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_rcl_pending ON public.regulatory_change_log USING btree (impact_assessed) WHERE (NOT impact_assessed);


--
-- Name: idx_recent_searches_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_recent_searches_user ON public.recent_searches USING btree (user_id, searched_at DESC);


--
-- Name: idx_reg_requests_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_reg_requests_status ON public.regulator_requests USING btree (status);


--
-- Name: idx_reg_sector_regulator; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_reg_sector_regulator ON public.regulator_sector_enforcement USING btree (regulator_id);


--
-- Name: idx_reg_sector_sector; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_reg_sector_sector ON public.regulator_sector_enforcement USING btree (sector_code);


--
-- Name: idx_report_shares_recipient; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_report_shares_recipient ON public.report_shares USING btree (recipient_id, recipient_type);


--
-- Name: idx_report_shares_report_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_report_shares_report_id ON public.report_shares USING btree (report_id);


--
-- Name: idx_risk_control_control; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_risk_control_control ON public.risk_control_mappings USING btree (control_id);


--
-- Name: idx_risk_control_risk; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_risk_control_risk ON public.risk_control_mappings USING btree (risk_id);


--
-- Name: idx_risk_criteria_tenant; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_risk_criteria_tenant ON public.risk_criteria USING btree (tenant_id);


--
-- Name: idx_risk_criteria_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_risk_criteria_type ON public.risk_criteria USING btree (criteria_type);


--
-- Name: idx_risks_category; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_risks_category ON public.risks USING btree (risk_category_id);


--
-- Name: idx_risks_sectors; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_risks_sectors ON public.risks USING gin (sector_codes);


--
-- Name: idx_roadmap_tasks_roadmap; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_roadmap_tasks_roadmap ON public.roadmap_tasks USING btree (roadmap_id);


--
-- Name: idx_roadmap_tasks_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_roadmap_tasks_status ON public.roadmap_tasks USING btree (status);


--
-- Name: idx_role_function_role; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_role_function_role ON public.role_function_map USING btree (role_id);


--
-- Name: idx_role_function_tenant; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_role_function_tenant ON public.role_function_map USING btree (tenant_id);


--
-- Name: idx_role_functions_category; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_role_functions_category ON public.role_functions USING btree (function_category);


--
-- Name: idx_role_functions_module; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_role_functions_module ON public.role_functions USING btree (module_code);


--
-- Name: idx_roles_tenant; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_roles_tenant ON public.roles USING btree (tenant_id);


--
-- Name: idx_runbook_trigger; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_runbook_trigger ON public.agrc_runbooks USING btree (trigger_event);


--
-- Name: idx_saved_searches_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_saved_searches_user ON public.saved_searches USING btree (user_id);


--
-- Name: idx_scan_schedules_next; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_scan_schedules_next ON public.scan_schedules USING btree (next_run_date);


--
-- Name: idx_scan_schedules_tenant; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_scan_schedules_tenant ON public.scan_schedules USING btree (tenant_id);


--
-- Name: idx_scan_schedules_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_scan_schedules_type ON public.scan_schedules USING btree (scan_type);


--
-- Name: idx_sector_framework_app; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sector_framework_app ON public.sector_framework USING btree (applicability);


--
-- Name: idx_sector_framework_fw; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sector_framework_fw ON public.sector_framework USING btree (framework_code);


--
-- Name: idx_sector_regulator_app; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sector_regulator_app ON public.sector_regulator USING btree (applicability);


--
-- Name: idx_sector_regulator_reg; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sector_regulator_reg ON public.sector_regulator USING btree (regulator_id);


--
-- Name: idx_sector_risks_risk; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sector_risks_risk ON public.sector_risks USING btree (risk_id);


--
-- Name: idx_sector_risks_sector; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sector_risks_sector ON public.sector_risks USING btree (sector_code);


--
-- Name: idx_sector_risks_sector_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sector_risks_sector_id ON public.sector_risks USING btree (sector_id);


--
-- Name: idx_sectors_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sectors_active ON public._retired_lookup_sectors USING btree (is_active) WHERE (is_active = true);


--
-- Name: idx_sectors_code; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sectors_code ON public._retired_lookup_sectors USING btree (sector_code);


--
-- Name: idx_sectors_country; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sectors_country ON public.sectors USING btree (country_code);


--
-- Name: idx_sectors_level; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sectors_level ON public._retired_lookup_sectors USING btree (level);


--
-- Name: idx_sectors_name_en; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sectors_name_en ON public._retired_lookup_sectors USING btree (sector_name_en);


--
-- Name: idx_sectors_parent; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sectors_parent ON public._retired_lookup_sectors USING btree (parent_sector_code);


--
-- Name: idx_sectors_search_ar; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sectors_search_ar ON public._retired_lookup_sectors USING gin (to_tsvector('arabic'::regconfig, (((sector_name_ar)::text || ' '::text) || COALESCE(description_ar, ''::text))));


--
-- Name: idx_sectors_search_en; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sectors_search_en ON public._retired_lookup_sectors USING gin (to_tsvector('english'::regconfig, (((sector_name_en)::text || ' '::text) || COALESCE(description_en, ''::text))));


--
-- Name: idx_sectors_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sectors_status ON public.sectors USING btree (status);


--
-- Name: idx_seed_mappings_module; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_seed_mappings_module ON public.onboarding_seed_mappings USING btree (module_code);


--
-- Name: idx_sessions_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sessions_created ON public.onboarding_sessions USING btree (created_at);


--
-- Name: idx_sessions_module; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sessions_module ON public.onboarding_sessions USING btree (module_code);


--
-- Name: idx_sessions_parent; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sessions_parent ON public.onboarding_sessions USING btree (parent_session_id) WHERE (parent_session_id IS NOT NULL);


--
-- Name: idx_sessions_tenant; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sessions_tenant ON public.onboarding_sessions USING btree (tenant_id);


--
-- Name: idx_sop_process; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sop_process ON public.sop_procedures USING btree (process_type, stage_id);


--
-- Name: idx_stage_definitions_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_stage_definitions_active ON public._retired_onboarding_stage_definitions USING btree (is_active) WHERE (is_active = true);


--
-- Name: idx_stage_definitions_code; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_stage_definitions_code ON public._retired_onboarding_stage_definitions USING btree (stage_code);


--
-- Name: idx_stage_definitions_sort; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_stage_definitions_sort ON public._retired_onboarding_stage_definitions USING btree (sort_order);


--
-- Name: idx_standup_digests_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_standup_digests_date ON public.standup_digests USING btree (generated_at DESC);


--
-- Name: idx_startup_checklists_session; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_startup_checklists_session ON public.startup_checklists USING btree (session_id);


--
-- Name: idx_startup_checklists_tenant; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_startup_checklists_tenant ON public.startup_checklists USING btree (tenant_id);


--
-- Name: idx_sub_audit_action; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sub_audit_action ON public.subscription_audit_log USING btree (action);


--
-- Name: idx_sub_audit_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sub_audit_created ON public.subscription_audit_log USING btree (created_at DESC);


--
-- Name: idx_sub_audit_tenant; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sub_audit_tenant ON public.subscription_audit_log USING btree (tenant_id);


--
-- Name: idx_sub_cr_effective; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sub_cr_effective ON public.subscription_change_requests USING btree (effective_at);


--
-- Name: idx_sub_cr_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sub_cr_status ON public.subscription_change_requests USING btree (status);


--
-- Name: idx_sub_cr_tenant; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sub_cr_tenant ON public.subscription_change_requests USING btree (tenant_id);


--
-- Name: idx_sub_ext_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sub_ext_created ON public.subscription_extensions USING btree (created_at DESC);


--
-- Name: idx_sub_ext_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sub_ext_status ON public.subscription_extensions USING btree (status);


--
-- Name: idx_sub_ext_tenant; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sub_ext_tenant ON public.subscription_extensions USING btree (tenant_id);


--
-- Name: idx_sub_notif_event; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sub_notif_event ON public.subscription_notifications_log USING btree (event_type);


--
-- Name: idx_sub_notif_sent; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sub_notif_sent ON public.subscription_notifications_log USING btree (sent_at DESC);


--
-- Name: idx_sub_notif_tenant; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sub_notif_tenant ON public.subscription_notifications_log USING btree (tenant_id);


--
-- Name: idx_subscription_change_log_tenant; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_subscription_change_log_tenant ON public.subscription_change_log USING btree (tenant_id, created_at DESC);


--
-- Name: idx_subscription_change_log_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_subscription_change_log_type ON public.subscription_change_log USING btree (change_type, created_at DESC);


--
-- Name: idx_subscriptions_ext_sub_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_subscriptions_ext_sub_id ON public.subscriptions USING btree (external_subscription_id);


--
-- Name: idx_subscriptions_grace_ends; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_subscriptions_grace_ends ON public.subscriptions USING btree (grace_ends_at);


--
-- Name: idx_subscriptions_period_end; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_subscriptions_period_end ON public.subscriptions USING btree (current_period_end);


--
-- Name: idx_subscriptions_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_subscriptions_status ON public.subscriptions USING btree (status);


--
-- Name: idx_subscriptions_stripe_cust; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_subscriptions_stripe_cust ON public.subscriptions USING btree (stripe_customer_id);


--
-- Name: idx_subscriptions_tenant; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_subscriptions_tenant ON public.subscriptions USING btree (tenant_id);


--
-- Name: idx_subscriptions_trial_ends; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_subscriptions_trial_ends ON public.subscriptions USING btree (trial_ends_at) WHERE ((status)::text = 'trialing'::text);


--
-- Name: idx_table_system_flags_category; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_table_system_flags_category ON public.table_system_flags USING btree (system_category);


--
-- Name: idx_table_system_flags_module; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_table_system_flags_module ON public.table_system_flags USING btree (module_name);


--
-- Name: idx_team_members_team; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_team_members_team ON public.team_members USING btree (team_id);


--
-- Name: idx_team_members_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_team_members_user ON public.team_members USING btree (user_id);


--
-- Name: idx_teams_code; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_teams_code ON public.teams USING btree (team_code);


--
-- Name: idx_teams_lead; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_teams_lead ON public.teams USING btree (team_lead_user_id);


--
-- Name: idx_teams_parent; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_teams_parent ON public.teams USING btree (parent_team_id);


--
-- Name: idx_telemetry_subject; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_telemetry_subject ON public.telemetry_signals USING btree (subject_key, occurred_at DESC);


--
-- Name: idx_tenant_blueprints_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_tenant_blueprints_active ON public.tenant_blueprints USING btree (tenant_id, status) WHERE ((status)::text = 'active'::text);


--
-- Name: idx_tenant_overrides_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_tenant_overrides_active ON public._retired_onboarding_tenant_overrides USING btree (is_active) WHERE (is_active = true);


--
-- Name: idx_tenant_overrides_key; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_tenant_overrides_key ON public._retired_onboarding_tenant_overrides USING btree (override_key);


--
-- Name: idx_tenant_overrides_tenant; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_tenant_overrides_tenant ON public._retired_onboarding_tenant_overrides USING btree (tenant_id);


--
-- Name: idx_tenant_overrides_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_tenant_overrides_type ON public._retired_onboarding_tenant_overrides USING btree (override_type);


--
-- Name: idx_tenant_regulatory_tenant; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_tenant_regulatory_tenant ON public.tenant_regulatory_profile USING btree (tenant_id);


--
-- Name: idx_tenant_settings_category; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_tenant_settings_category ON public.tenant_settings USING btree (setting_category);


--
-- Name: idx_tenant_settings_tenant; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_tenant_settings_tenant ON public.tenant_settings USING btree (tenant_id);


--
-- Name: idx_tenant_sso_tenant; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_tenant_sso_tenant ON public.tenant_sso_config USING btree (tenant_id);


--
-- Name: idx_tenant_usage_taken; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_tenant_usage_taken ON public.tenant_usage_snapshots USING btree (taken_at DESC);


--
-- Name: idx_tenant_usage_tenant; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_tenant_usage_tenant ON public.tenant_usage_snapshots USING btree (tenant_id);


--
-- Name: idx_tenant_user_memberships_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_tenant_user_memberships_status ON public.tenant_user_memberships USING btree (status);


--
-- Name: idx_tenant_user_memberships_status_v2; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_tenant_user_memberships_status_v2 ON public.tenant_user_memberships USING btree (status);


--
-- Name: idx_tenant_user_memberships_tenant; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_tenant_user_memberships_tenant ON public.tenant_user_memberships USING btree (tenant_id);


--
-- Name: idx_tenant_user_memberships_tenant_v2; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_tenant_user_memberships_tenant_v2 ON public.tenant_user_memberships USING btree (tenant_id);


--
-- Name: idx_tenant_user_memberships_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_tenant_user_memberships_type ON public.tenant_user_memberships USING btree (membership_type);


--
-- Name: idx_tenant_user_memberships_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_tenant_user_memberships_user ON public.tenant_user_memberships USING btree (user_id);


--
-- Name: idx_tenant_user_memberships_user_v2; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_tenant_user_memberships_user_v2 ON public.tenant_user_memberships USING btree (user_id);


--
-- Name: idx_tenants_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_tenants_status ON public.tenants USING btree (status);


--
-- Name: idx_timezones_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_timezones_active ON public._retired_lookup_timezones USING btree (is_active) WHERE (is_active = true);


--
-- Name: idx_timezones_code; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_timezones_code ON public._retired_lookup_timezones USING btree (timezone_code);


--
-- Name: idx_timezones_offset; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_timezones_offset ON public._retired_lookup_timezones USING btree (utc_offset_minutes);


--
-- Name: idx_tme_op_mode; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_tme_op_mode ON public.tenant_module_entitlements USING btree (default_operation_mode);


--
-- Name: idx_tme_qiyas; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_tme_qiyas ON public.tenant_module_entitlements USING btree (qiyas_enabled) WHERE (qiyas_enabled = true);


--
-- Name: idx_tme_tenant; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_tme_tenant ON public.tenant_module_entitlements USING btree (tenant_id);


--
-- Name: idx_training_schedules_next; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_training_schedules_next ON public.training_schedules USING btree (next_scheduled);


--
-- Name: idx_training_schedules_tenant; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_training_schedules_tenant ON public.training_schedules USING btree (tenant_id);


--
-- Name: idx_training_schedules_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_training_schedules_type ON public.training_schedules USING btree (training_type);


--
-- Name: idx_translations_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_translations_active ON public._retired_onboarding_translations USING btree (is_active) WHERE (is_active = true);


--
-- Name: idx_translations_context; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_translations_context ON public._retired_onboarding_translations USING btree (context);


--
-- Name: idx_translations_key; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_translations_key ON public._retired_onboarding_translations USING btree (translation_key);


--
-- Name: idx_translations_module; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_translations_module ON public._retired_onboarding_translations USING btree (module);


--
-- Name: idx_tri_change; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_tri_change ON public.tenant_regulatory_impacts USING btree (change_id);


--
-- Name: idx_tri_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_tri_status ON public.tenant_regulatory_impacts USING btree (status) WHERE ((status)::text <> 'resolved'::text);


--
-- Name: idx_tri_tenant; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_tri_tenant ON public.tenant_regulatory_impacts USING btree (tenant_id);


--
-- Name: idx_triage_proposals_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_triage_proposals_status ON public.triage_proposals USING btree (status, created_at DESC);


--
-- Name: idx_trial_ext_tenant; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_trial_ext_tenant ON public.trial_extension_requests USING btree (tenant_id, status, created_at DESC);


--
-- Name: idx_ts_tenant; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ts_tenant ON public.tenant_sectors USING btree (tenant_id);


--
-- Name: idx_tum_org_role; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_tum_org_role ON public.tenant_user_memberships USING btree (org_role_code);


--
-- Name: idx_tum_tenant; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_tum_tenant ON public.tenant_user_memberships USING btree (tenant_id);


--
-- Name: idx_tum_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_tum_user ON public.tenant_user_memberships USING btree (user_id);


--
-- Name: idx_tum_user_version; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_tum_user_version ON public.tenant_user_memberships USING btree (tenant_id, user_id, authz_version);


--
-- Name: idx_ui_config_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ui_config_active ON public._retired_onboarding_ui_config USING btree (is_active) WHERE (is_active = true);


--
-- Name: idx_ui_config_category; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ui_config_category ON public._retired_onboarding_ui_config USING btree (category);


--
-- Name: idx_ui_config_key; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ui_config_key ON public._retired_onboarding_ui_config USING btree (config_key);


--
-- Name: idx_usage_snap_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_usage_snap_date ON public.usage_snapshots USING btree (snapshot_date DESC);


--
-- Name: idx_usage_snap_tenant; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_usage_snap_tenant ON public.usage_snapshots USING btree (tenant_id);


--
-- Name: idx_usage_snap_tenant_date; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX idx_usage_snap_tenant_date ON public.usage_snapshots USING btree (tenant_id, snapshot_date);


--
-- Name: idx_user_activities_tenant; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_activities_tenant ON public.user_activities USING btree (tenant_id, created_at DESC);


--
-- Name: idx_user_activities_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_activities_user ON public.user_activities USING btree (user_id, created_at DESC);


--
-- Name: idx_user_answers_question; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_answers_question ON public._retired_onboarding_user_answers USING btree (question_id);


--
-- Name: idx_user_answers_session; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_answers_session ON public._retired_onboarding_user_answers USING btree (session_id);


--
-- Name: idx_user_answers_session_question; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX idx_user_answers_session_question ON public.onboarding_user_answers USING btree (session_id, question_id);


--
-- Name: idx_user_answers_tenant; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_answers_tenant ON public._retired_onboarding_user_answers USING btree (tenant_id);


--
-- Name: idx_user_answers_unique; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX idx_user_answers_unique ON public._retired_onboarding_user_answers USING btree (session_id, question_id);


--
-- Name: idx_user_answers_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_answers_user ON public._retired_onboarding_user_answers USING btree (user_id);


--
-- Name: idx_user_favorites_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_favorites_user ON public.user_favorites USING btree (user_id, item_type);


--
-- Name: idx_user_func_override_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_func_override_active ON public.user_function_overrides USING btree (user_id, active);


--
-- Name: idx_user_func_override_function; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_func_override_function ON public.user_function_overrides USING btree (function_code);


--
-- Name: idx_user_func_override_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_func_override_user ON public.user_function_overrides USING btree (user_id);


--
-- Name: idx_user_preferences_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_preferences_user ON public.user_preferences USING btree (user_id);


--
-- Name: idx_users_ciso; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_users_ciso ON public.users USING btree (is_ciso) WHERE (is_ciso = true);


--
-- Name: idx_users_department; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_users_department ON public.users USING btree (department_id) WHERE (department_id IS NOT NULL);


--
-- Name: idx_users_dpo; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_users_dpo ON public.users USING btree (is_dpo) WHERE (is_dpo = true);


--
-- Name: idx_users_manager; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_users_manager ON public.users USING btree (manager_user_id) WHERE (manager_user_id IS NOT NULL);


--
-- Name: idx_users_reports_to; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_users_reports_to ON public.users USING btree (reports_to) WHERE (reports_to IS NOT NULL);


--
-- Name: idx_users_tenant; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_users_tenant ON public.users USING btree (tenant_id);


--
-- Name: idx_vendor_assessments_risk; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_vendor_assessments_risk ON public.vendor_assessments USING btree (risk_rating);


--
-- Name: idx_vendor_assessments_tenant; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_vendor_assessments_tenant ON public.vendor_assessments USING btree (tenant_id);


--
-- Name: idx_vendor_assessments_vendor; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_vendor_assessments_vendor ON public.vendor_assessments USING btree (vendor_id);


--
-- Name: idx_vendor_scores_vendor; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_vendor_scores_vendor ON public.vendor_engagement_scores USING btree (vendor_id, computed_at DESC);


--
-- Name: idx_workspace_activation_log_session; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_workspace_activation_log_session ON public.workspace_activation_log USING btree (session_id);


--
-- Name: idx_workspace_activation_log_tenant; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_workspace_activation_log_tenant ON public.workspace_activation_log USING btree (tenant_id);


--
-- Name: idx_workspace_activation_session; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_workspace_activation_session ON public.workspace_activation_log USING btree (session_id);


--
-- Name: idx_workspace_activation_tenant; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_workspace_activation_tenant ON public.workspace_activation_log USING btree (tenant_id);


--
-- Name: idx_workspace_onboarding_session; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_workspace_onboarding_session ON public.workspace_onboarding_links USING btree (onboarding_session_id);


--
-- Name: idx_workspace_onboarding_workspace; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_workspace_onboarding_workspace ON public.workspace_onboarding_links USING btree (workspace_id);


--
-- Name: idx_ws_queue_cleanup; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ws_queue_cleanup ON public.websocket_event_queue USING btree (created_at) WHERE (delivered = true);


--
-- Name: idx_ws_queue_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ws_queue_user ON public.websocket_event_queue USING btree (target_user_id, delivered, created_at);


--
-- Name: idx_wte_participant; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_wte_participant ON public.workflow_timeline_entries USING btree (assigned_participant_id);


--
-- Name: idx_wte_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_wte_status ON public.workflow_timeline_entries USING btree (status, due_date);


--
-- Name: idx_wte_workflow; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_wte_workflow ON public.workflow_timeline_entries USING btree (parent_workflow_id);


--
-- Name: mv_ac_authority; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX mv_ac_authority ON public.mv_authority_coverage USING btree (authority_code);


--
-- Name: mv_cmm_pair; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX mv_cmm_pair ON public.mv_cross_mapping_matrix USING btree (source_framework, target_framework);


--
-- Name: mv_fcd_framework; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX mv_fcd_framework ON public.mv_framework_control_distribution USING btree (framework_code);


--
-- Name: mv_rcs_singleton; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX mv_rcs_singleton ON public.mv_regulatory_catalog_summary USING btree (refreshed_at);


--
-- Name: mv_srb_sector; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX mv_srb_sector ON public.mv_sector_regulatory_burden USING btree (sector_code);


--
-- Name: uk_grc_role_staffing; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uk_grc_role_staffing ON public.lookup_grc_role_staffing USING btree (range_code, sector_code, role_code);


--
-- Name: uq_workspace_profile_singleton; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_workspace_profile_singleton ON public.workspace_profile USING btree (((workspace_profile_id IS NOT NULL)));


--
-- Name: ux_auth_framework; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX ux_auth_framework ON public.lookup_authority_frameworks USING btree (authority_code, framework_code) WHERE is_active;


--
-- Name: ux_auth_sector; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX ux_auth_sector ON public.lookup_authority_sector_mapping USING btree (authority_code, sector_code) WHERE is_active;


--
-- Name: v_onboarding_questions_full _RETURN; Type: RULE; Schema: public; Owner: -
--

CREATE OR REPLACE VIEW public.v_onboarding_questions_full AS
 SELECT q.id,
    q.question_code,
    q.stage_code,
    s.label_en AS stage_name_en,
    s.label_ar AS stage_name_ar,
    qt.type_name AS question_type,
    qt.ui_component,
    q.question_text_en,
    q.question_text_ar,
    q.help_text_en,
    q.help_text_ar,
    q.is_required,
    q.display_order,
    q.display_group,
    q.lookup_table,
    q.validation_rules,
    q.impacts_provisioning,
    q.impacts_compliance,
    count(DISTINCT g.id) AS guidance_count,
    count(DISTINCT o.id) AS options_count
   FROM ((((public._retired_onboarding_questions q
     JOIN public._retired_onboarding_stage_definitions s ON (((q.stage_code)::text = (s.stage_code)::text)))
     JOIN public._retired_onboarding_question_types qt ON ((q.question_type_id = qt.id)))
     LEFT JOIN public._retired_onboarding_field_guidance g ON ((q.id = g.question_id)))
     LEFT JOIN public._retired_onboarding_question_options o ON ((q.id = o.question_id)))
  WHERE (q.is_active = true)
  GROUP BY q.id, s.label_en, s.label_ar, qt.type_name, qt.ui_component;


--
-- Name: _retired_provisioning_step_definitions audit_provisioning_steps; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER audit_provisioning_steps AFTER INSERT OR DELETE OR UPDATE ON public._retired_provisioning_step_definitions FOR EACH ROW EXECUTE FUNCTION public.audit_config_changes();


--
-- Name: _retired_onboarding_stage_definitions audit_stage_definitions; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER audit_stage_definitions AFTER INSERT OR DELETE OR UPDATE ON public._retired_onboarding_stage_definitions FOR EACH ROW EXECUTE FUNCTION public.audit_config_changes();


--
-- Name: _retired_onboarding_translations audit_translations; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER audit_translations AFTER INSERT OR DELETE OR UPDATE ON public._retired_onboarding_translations FOR EACH ROW EXECUTE FUNCTION public.audit_config_changes();


--
-- Name: _retired_onboarding_ui_config audit_ui_config; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER audit_ui_config AFTER INSERT OR DELETE OR UPDATE ON public._retired_onboarding_ui_config FOR EACH ROW EXECUTE FUNCTION public.audit_config_changes();


--
-- Name: _retired_onboarding_user_answers track_user_answer_changes; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER track_user_answer_changes AFTER INSERT OR DELETE OR UPDATE ON public._retired_onboarding_user_answers FOR EACH ROW EXECUTE FUNCTION public.track_answer_changes();


--
-- Name: regulatory_controls trg_control_search; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_control_search BEFORE INSERT OR UPDATE ON public.regulatory_controls FOR EACH ROW EXECUTE FUNCTION public.update_control_search_vector();


--
-- Name: audit_merkle_witnesses trg_merkle_witness_no_delete; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_merkle_witness_no_delete BEFORE DELETE ON public.audit_merkle_witnesses FOR EACH ROW EXECUTE FUNCTION public.merkle_witness_immutable();


--
-- Name: onboarding_sessions trg_onboarding_session_events; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_onboarding_session_events AFTER INSERT OR UPDATE ON public.onboarding_sessions FOR EACH ROW EXECUTE FUNCTION public.emit_onboarding_event();


--
-- Name: provisioning_jobs trg_provisioning_job_events; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_provisioning_job_events AFTER INSERT OR UPDATE ON public.provisioning_jobs FOR EACH ROW EXECUTE FUNCTION public.emit_provisioning_event();


--
-- Name: sector_framework trg_sync_sector_frameworks; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_sync_sector_frameworks AFTER INSERT OR DELETE OR UPDATE ON public.sector_framework FOR EACH ROW EXECUTE FUNCTION public.fn_sync_sector_frameworks();


--
-- Name: sector_regulator trg_sync_sector_regulators; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_sync_sector_regulators AFTER INSERT OR DELETE OR UPDATE ON public.sector_regulator FOR EACH ROW EXECUTE FUNCTION public.fn_sync_sector_regulators();


--
-- Name: approval_chains update_approval_chains_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_approval_chains_updated_at BEFORE UPDATE ON public.approval_chains FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: audit_findings update_audit_findings_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_audit_findings_updated_at BEFORE UPDATE ON public.audit_findings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: audit_schedules update_audit_schedules_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_audit_schedules_updated_at BEFORE UPDATE ON public.audit_schedules FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: bcp_config update_bcp_config_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_bcp_config_updated_at BEFORE UPDATE ON public.bcp_config FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: compliance_mappings update_compliance_mappings_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_compliance_mappings_updated_at BEFORE UPDATE ON public.compliance_mappings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: data_classifications update_data_classifications_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_data_classifications_updated_at BEFORE UPDATE ON public.data_classifications FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: data_governance_config update_data_governance_config_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_data_governance_config_updated_at BEFORE UPDATE ON public.data_governance_config FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: department_roles update_department_roles_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_department_roles_updated_at BEFORE UPDATE ON public.department_roles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: _retired_onboarding_dynamic_lookups update_dynamic_lookups_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_dynamic_lookups_updated_at BEFORE UPDATE ON public._retired_onboarding_dynamic_lookups FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: escalation_rules update_escalation_rules_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_escalation_rules_updated_at BEFORE UPDATE ON public.escalation_rules FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: evidence_config update_evidence_config_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_evidence_config_updated_at BEFORE UPDATE ON public.evidence_config FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: exception_management update_exception_management_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_exception_management_updated_at BEFORE UPDATE ON public.exception_management FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: governance_config update_governance_config_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_governance_config_updated_at BEFORE UPDATE ON public.governance_config FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: _retired_onboarding_field_guidance update_guidance_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_guidance_updated_at BEFORE UPDATE ON public._retired_onboarding_field_guidance FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: incident_categories update_incident_categories_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_incident_categories_updated_at BEFORE UPDATE ON public.incident_categories FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: integrations update_integrations_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_integrations_updated_at BEFORE UPDATE ON public.integrations FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: kri_config update_kri_config_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_kri_config_updated_at BEFORE UPDATE ON public.kri_config FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: _retired_lookup_cities update_lookup_cities_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_lookup_cities_updated_at BEFORE UPDATE ON public._retired_lookup_cities FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: _retired_lookup_countries update_lookup_countries_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_lookup_countries_updated_at BEFORE UPDATE ON public._retired_lookup_countries FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: _retired_lookup_employee_ranges update_lookup_employee_ranges_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_lookup_employee_ranges_updated_at BEFORE UPDATE ON public._retired_lookup_employee_ranges FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: _retired_lookup_frameworks update_lookup_frameworks_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_lookup_frameworks_updated_at BEFORE UPDATE ON public._retired_lookup_frameworks FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: _retired_lookup_languages update_lookup_languages_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_lookup_languages_updated_at BEFORE UPDATE ON public._retired_lookup_languages FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: _retired_lookup_sectors update_lookup_sectors_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_lookup_sectors_updated_at BEFORE UPDATE ON public._retired_lookup_sectors FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: _retired_lookup_timezones update_lookup_timezones_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_lookup_timezones_updated_at BEFORE UPDATE ON public._retired_lookup_timezones FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: maturity_assessments update_maturity_assessments_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_maturity_assessments_updated_at BEFORE UPDATE ON public.maturity_assessments FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: migration_config update_migration_config_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_migration_config_updated_at BEFORE UPDATE ON public.migration_config FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: _retired_onboarding_stage_definitions update_onboarding_stage_definitions_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_onboarding_stage_definitions_updated_at BEFORE UPDATE ON public._retired_onboarding_stage_definitions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: _retired_onboarding_tenant_overrides update_onboarding_tenant_overrides_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_onboarding_tenant_overrides_updated_at BEFORE UPDATE ON public._retired_onboarding_tenant_overrides FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: _retired_onboarding_translations update_onboarding_translations_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_onboarding_translations_updated_at BEFORE UPDATE ON public._retired_onboarding_translations FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: _retired_onboarding_ui_config update_onboarding_ui_config_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_onboarding_ui_config_updated_at BEFORE UPDATE ON public._retired_onboarding_ui_config FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: organization_units update_organization_units_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_organization_units_updated_at BEFORE UPDATE ON public.organization_units FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: _retired_provisioning_step_definitions update_provisioning_step_definitions_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_provisioning_step_definitions_updated_at BEFORE UPDATE ON public._retired_provisioning_step_definitions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: _retired_onboarding_question_options update_question_options_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_question_options_updated_at BEFORE UPDATE ON public._retired_onboarding_question_options FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: _retired_onboarding_questions update_questions_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_questions_updated_at BEFORE UPDATE ON public._retired_onboarding_questions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: raci_config update_raci_config_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_raci_config_updated_at BEFORE UPDATE ON public.raci_config FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: risk_criteria update_risk_criteria_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_risk_criteria_updated_at BEFORE UPDATE ON public.risk_criteria FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: role_function_map update_role_function_map_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_role_function_map_updated_at BEFORE UPDATE ON public.role_function_map FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: scan_schedules update_scan_schedules_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_scan_schedules_updated_at BEFORE UPDATE ON public.scan_schedules FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: _retired_onboarding_user_answers update_session_on_answer_change; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_session_on_answer_change AFTER INSERT OR DELETE OR UPDATE ON public._retired_onboarding_user_answers FOR EACH ROW EXECUTE FUNCTION public.update_session_progress();


--
-- Name: onboarding_sessions update_sessions_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_sessions_updated_at BEFORE UPDATE ON public.onboarding_sessions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: tenant_regulatory_profile update_tenant_regulatory_profile_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_tenant_regulatory_profile_updated_at BEFORE UPDATE ON public.tenant_regulatory_profile FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: tenant_settings update_tenant_settings_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_tenant_settings_updated_at BEFORE UPDATE ON public.tenant_settings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: tenant_sso_config update_tenant_sso_config_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_tenant_sso_config_updated_at BEFORE UPDATE ON public.tenant_sso_config FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: training_schedules update_training_schedules_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_training_schedules_updated_at BEFORE UPDATE ON public.training_schedules FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: _retired_onboarding_user_answers update_user_answers_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_user_answers_updated_at BEFORE UPDATE ON public._retired_onboarding_user_answers FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: vendor_assessments update_vendor_assessments_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_vendor_assessments_updated_at BEFORE UPDATE ON public.vendor_assessments FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: agent_registry agent_registry_product_key_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.agent_registry
    ADD CONSTRAINT agent_registry_product_key_fkey FOREIGN KEY (product_key) REFERENCES public.platform_products(product_key);


--
-- Name: applicability_explanations applicability_explanations_sector_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.applicability_explanations
    ADD CONSTRAINT applicability_explanations_sector_id_fkey FOREIGN KEY (sector_id) REFERENCES public.sectors(sector_id) ON DELETE CASCADE;


--
-- Name: approval_chains approval_chains_approver_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.approval_chains
    ADD CONSTRAINT approval_chains_approver_user_id_fkey FOREIGN KEY (approver_user_id) REFERENCES public.users(user_id);


--
-- Name: approval_chains approval_chains_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.approval_chains
    ADD CONSTRAINT approval_chains_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(tenant_id) ON DELETE CASCADE;


--
-- Name: approval_decisions approval_decisions_approval_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.approval_decisions
    ADD CONSTRAINT approval_decisions_approval_id_fkey FOREIGN KEY (approval_id) REFERENCES public.approval_requests(approval_id);


--
-- Name: audit_findings audit_findings_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_findings
    ADD CONSTRAINT audit_findings_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(tenant_id) ON DELETE CASCADE;


--
-- Name: audit_merkle_witnesses audit_merkle_witnesses_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_merkle_witnesses
    ADD CONSTRAINT audit_merkle_witnesses_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(tenant_id);


--
-- Name: audit_schedules audit_schedules_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_schedules
    ADD CONSTRAINT audit_schedules_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(tenant_id) ON DELETE CASCADE;


--
-- Name: bcp_config bcp_config_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bcp_config
    ADD CONSTRAINT bcp_config_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(tenant_id) ON DELETE CASCADE;


--
-- Name: compliance_mappings compliance_mappings_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.compliance_mappings
    ADD CONSTRAINT compliance_mappings_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(tenant_id) ON DELETE CASCADE;


--
-- Name: compliance_risks compliance_risks_control_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.compliance_risks
    ADD CONSTRAINT compliance_risks_control_id_fkey FOREIGN KEY (control_id) REFERENCES public.regulatory_controls(id);


--
-- Name: control_cross_mappings control_cross_mappings_source_control_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.control_cross_mappings
    ADD CONSTRAINT control_cross_mappings_source_control_id_fkey FOREIGN KEY (source_control_id) REFERENCES public.regulatory_controls(id);


--
-- Name: control_cross_mappings control_cross_mappings_target_control_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.control_cross_mappings
    ADD CONSTRAINT control_cross_mappings_target_control_id_fkey FOREIGN KEY (target_control_id) REFERENCES public.regulatory_controls(id);


--
-- Name: control_domains control_domains_framework_code_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.control_domains
    ADD CONSTRAINT control_domains_framework_code_fkey FOREIGN KEY (framework_code) REFERENCES public.regulatory_frameworks(framework_code);


--
-- Name: control_domains control_domains_parent_domain_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.control_domains
    ADD CONSTRAINT control_domains_parent_domain_id_fkey FOREIGN KEY (parent_domain_id) REFERENCES public.control_domains(id);


--
-- Name: control_domains control_domains_version_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.control_domains
    ADD CONSTRAINT control_domains_version_id_fkey FOREIGN KEY (version_id) REFERENCES public.framework_versions(id);


--
-- Name: control_evidence_requirements control_evidence_requirements_control_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.control_evidence_requirements
    ADD CONSTRAINT control_evidence_requirements_control_id_fkey FOREIGN KEY (control_id) REFERENCES public.regulatory_controls(id);


--
-- Name: control_regulator_mapping control_regulator_mapping_control_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.control_regulator_mapping
    ADD CONSTRAINT control_regulator_mapping_control_id_fkey FOREIGN KEY (control_id) REFERENCES public.regulatory_controls(id);


--
-- Name: control_regulator_mapping control_regulator_mapping_regulator_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.control_regulator_mapping
    ADD CONSTRAINT control_regulator_mapping_regulator_id_fkey FOREIGN KEY (regulator_id) REFERENCES public.regulators(regulator_id);


--
-- Name: control_requirements control_requirements_control_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.control_requirements
    ADD CONSTRAINT control_requirements_control_id_fkey FOREIGN KEY (control_id) REFERENCES public.regulatory_controls(id);


--
-- Name: control_sectors control_sectors_control_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.control_sectors
    ADD CONSTRAINT control_sectors_control_id_fkey FOREIGN KEY (control_id) REFERENCES public.regulatory_controls(id);


--
-- Name: control_sectors control_sectors_sector_code_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.control_sectors
    ADD CONSTRAINT control_sectors_sector_code_fkey FOREIGN KEY (sector_code) REFERENCES public.lookup_sectors(sector_code);


--
-- Name: cross_mappings cross_mappings_source_node_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cross_mappings
    ADD CONSTRAINT cross_mappings_source_node_id_fkey FOREIGN KEY (source_node_id) REFERENCES public.instrument_structure(node_id);


--
-- Name: cross_mappings cross_mappings_target_node_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cross_mappings
    ADD CONSTRAINT cross_mappings_target_node_id_fkey FOREIGN KEY (target_node_id) REFERENCES public.instrument_structure(node_id);


--
-- Name: data_classifications data_classifications_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.data_classifications
    ADD CONSTRAINT data_classifications_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(tenant_id) ON DELETE CASCADE;


--
-- Name: data_governance_config data_governance_config_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.data_governance_config
    ADD CONSTRAINT data_governance_config_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(tenant_id) ON DELETE CASCADE;


--
-- Name: department_roles department_roles_department_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.department_roles
    ADD CONSTRAINT department_roles_department_id_fkey FOREIGN KEY (department_id) REFERENCES public.organization_units(id);


--
-- Name: department_roles department_roles_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.department_roles
    ADD CONSTRAINT department_roles_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(tenant_id) ON DELETE CASCADE;


--
-- Name: erp_field_mappings erp_field_mappings_connection_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.erp_field_mappings
    ADD CONSTRAINT erp_field_mappings_connection_id_fkey FOREIGN KEY (connection_id) REFERENCES public.erp_connections(connection_id) ON DELETE CASCADE;


--
-- Name: erp_sync_history erp_sync_history_connection_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.erp_sync_history
    ADD CONSTRAINT erp_sync_history_connection_id_fkey FOREIGN KEY (connection_id) REFERENCES public.erp_connections(connection_id) ON DELETE CASCADE;


--
-- Name: escalation_rules escalation_rules_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.escalation_rules
    ADD CONSTRAINT escalation_rules_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(tenant_id) ON DELETE CASCADE;


--
-- Name: event_type_registry event_type_registry_product_key_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.event_type_registry
    ADD CONSTRAINT event_type_registry_product_key_fkey FOREIGN KEY (product_key) REFERENCES public.platform_products(product_key);


--
-- Name: evidence_config evidence_config_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.evidence_config
    ADD CONSTRAINT evidence_config_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(tenant_id) ON DELETE CASCADE;


--
-- Name: evidence_lifecycle evidence_lifecycle_evidence_requirement_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.evidence_lifecycle
    ADD CONSTRAINT evidence_lifecycle_evidence_requirement_id_fkey FOREIGN KEY (evidence_requirement_id) REFERENCES public.evidence_requirements(id);


--
-- Name: evidence_requirements evidence_requirements_requirement_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.evidence_requirements
    ADD CONSTRAINT evidence_requirements_requirement_id_fkey FOREIGN KEY (requirement_id) REFERENCES public.control_requirements(id);


--
-- Name: exception_management exception_management_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.exception_management
    ADD CONSTRAINT exception_management_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(tenant_id) ON DELETE CASCADE;


--
-- Name: execution_plan_snapshots execution_plan_snapshots_blueprint_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.execution_plan_snapshots
    ADD CONSTRAINT execution_plan_snapshots_blueprint_id_fkey FOREIGN KEY (blueprint_id) REFERENCES public.tenant_blueprints(id);


--
-- Name: execution_plan_snapshots execution_plan_snapshots_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.execution_plan_snapshots
    ADD CONSTRAINT execution_plan_snapshots_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(tenant_id);


--
-- Name: framework_alias framework_alias_framework_code_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.framework_alias
    ADD CONSTRAINT framework_alias_framework_code_fkey FOREIGN KEY (framework_code) REFERENCES public.lookup_frameworks(framework_code);


--
-- Name: framework_relationships framework_relationships_source_framework_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.framework_relationships
    ADD CONSTRAINT framework_relationships_source_framework_fkey FOREIGN KEY (source_framework) REFERENCES public.regulatory_frameworks(framework_code);


--
-- Name: framework_relationships framework_relationships_target_framework_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.framework_relationships
    ADD CONSTRAINT framework_relationships_target_framework_fkey FOREIGN KEY (target_framework) REFERENCES public.regulatory_frameworks(framework_code);


--
-- Name: framework_version_diffs framework_version_diffs_framework_code_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.framework_version_diffs
    ADD CONSTRAINT framework_version_diffs_framework_code_fkey FOREIGN KEY (framework_code) REFERENCES public.regulatory_frameworks(framework_code);


--
-- Name: framework_versions framework_versions_framework_code_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.framework_versions
    ADD CONSTRAINT framework_versions_framework_code_fkey FOREIGN KEY (framework_code) REFERENCES public.regulatory_frameworks(framework_code);


--
-- Name: function_authorities function_authorities_function_code_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.function_authorities
    ADD CONSTRAINT function_authorities_function_code_fkey FOREIGN KEY (function_code) REFERENCES public.role_functions(function_code) ON DELETE CASCADE;


--
-- Name: governance_config governance_config_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.governance_config
    ADD CONSTRAINT governance_config_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(tenant_id) ON DELETE CASCADE;


--
-- Name: incident_categories incident_categories_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.incident_categories
    ADD CONSTRAINT incident_categories_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(tenant_id) ON DELETE CASCADE;


--
-- Name: instrument_structure instrument_structure_instrument_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.instrument_structure
    ADD CONSTRAINT instrument_structure_instrument_id_fkey FOREIGN KEY (instrument_id) REFERENCES public.instruments(instrument_id);


--
-- Name: instruments instruments_regulator_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.instruments
    ADD CONSTRAINT instruments_regulator_id_fkey FOREIGN KEY (regulator_id) REFERENCES public.regulators(regulator_id);


--
-- Name: integrations integrations_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.integrations
    ADD CONSTRAINT integrations_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(tenant_id) ON DELETE CASCADE;


--
-- Name: isic_risks isic_risks_risk_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.isic_risks
    ADD CONSTRAINT isic_risks_risk_id_fkey FOREIGN KEY (risk_id) REFERENCES public.risks(id) ON DELETE CASCADE;


--
-- Name: job_executions job_executions_job_name_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.job_executions
    ADD CONSTRAINT job_executions_job_name_fkey FOREIGN KEY (job_name) REFERENCES public.job_registry(job_name);


--
-- Name: kri_config kri_config_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.kri_config
    ADD CONSTRAINT kri_config_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(tenant_id) ON DELETE CASCADE;


--
-- Name: lookup_authority_frameworks lookup_authority_frameworks_authority_code_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lookup_authority_frameworks
    ADD CONSTRAINT lookup_authority_frameworks_authority_code_fkey FOREIGN KEY (authority_code) REFERENCES public.lookup_ksa_regulatory_authorities(authority_code);


--
-- Name: lookup_authority_frameworks lookup_authority_frameworks_framework_code_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lookup_authority_frameworks
    ADD CONSTRAINT lookup_authority_frameworks_framework_code_fkey FOREIGN KEY (framework_code) REFERENCES public.lookup_frameworks(framework_code);


--
-- Name: lookup_authority_sector_mapping lookup_authority_sector_mapping_authority_code_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lookup_authority_sector_mapping
    ADD CONSTRAINT lookup_authority_sector_mapping_authority_code_fkey FOREIGN KEY (authority_code) REFERENCES public.lookup_ksa_regulatory_authorities(authority_code);


--
-- Name: lookup_authority_sector_mapping lookup_authority_sector_mapping_sector_code_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lookup_authority_sector_mapping
    ADD CONSTRAINT lookup_authority_sector_mapping_sector_code_fkey FOREIGN KEY (sector_code) REFERENCES public.lookup_isic4_sectors(section_code);


--
-- Name: _retired_lookup_cities lookup_cities_country_code_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public._retired_lookup_cities
    ADD CONSTRAINT lookup_cities_country_code_fkey FOREIGN KEY (country_code) REFERENCES public._retired_lookup_countries(country_code);


--
-- Name: lookup_framework_module_triggers lookup_framework_module_triggers_framework_code_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lookup_framework_module_triggers
    ADD CONSTRAINT lookup_framework_module_triggers_framework_code_fkey FOREIGN KEY (framework_code) REFERENCES public.lookup_frameworks(framework_code);


--
-- Name: lookup_ksa_cities lookup_ksa_cities_province_code_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lookup_ksa_cities
    ADD CONSTRAINT lookup_ksa_cities_province_code_fkey FOREIGN KEY (province_code) REFERENCES public.lookup_ksa_provinces(province_code);


--
-- Name: lookup_sector_team_templates lookup_sector_team_templates_function_code_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lookup_sector_team_templates
    ADD CONSTRAINT lookup_sector_team_templates_function_code_fkey FOREIGN KEY (function_code) REFERENCES public.lookup_team_functions(function_code);


--
-- Name: lookup_team_control_mapping lookup_team_control_mapping_function_code_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lookup_team_control_mapping
    ADD CONSTRAINT lookup_team_control_mapping_function_code_fkey FOREIGN KEY (function_code) REFERENCES public.lookup_team_functions(function_code);


--
-- Name: maturity_assessments maturity_assessments_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.maturity_assessments
    ADD CONSTRAINT maturity_assessments_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(tenant_id) ON DELETE CASCADE;


--
-- Name: migration_config migration_config_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.migration_config
    ADD CONSTRAINT migration_config_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(tenant_id) ON DELETE CASCADE;


--
-- Name: onboarding_activity_log onboarding_activity_log_session_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.onboarding_activity_log
    ADD CONSTRAINT onboarding_activity_log_session_id_fkey FOREIGN KEY (session_id) REFERENCES public.onboarding_sessions(id) ON DELETE CASCADE;


--
-- Name: onboarding_activity_log onboarding_activity_log_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.onboarding_activity_log
    ADD CONSTRAINT onboarding_activity_log_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(user_id);


--
-- Name: onboarding_answer_history onboarding_answer_history_session_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.onboarding_answer_history
    ADD CONSTRAINT onboarding_answer_history_session_id_fkey FOREIGN KEY (session_id) REFERENCES public.onboarding_sessions(id) ON DELETE CASCADE;


--
-- Name: onboarding_answers onboarding_answers_session_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.onboarding_answers
    ADD CONSTRAINT onboarding_answers_session_id_fkey FOREIGN KEY (session_id) REFERENCES public.onboarding_sessions(id) ON DELETE CASCADE;


--
-- Name: onboarding_blockers onboarding_blockers_session_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.onboarding_blockers
    ADD CONSTRAINT onboarding_blockers_session_id_fkey FOREIGN KEY (session_id) REFERENCES public.onboarding_sessions(id) ON DELETE CASCADE;


--
-- Name: _retired_onboarding_compliance_mapping onboarding_compliance_mapping_question_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public._retired_onboarding_compliance_mapping
    ADD CONSTRAINT onboarding_compliance_mapping_question_id_fkey FOREIGN KEY (question_id) REFERENCES public._retired_onboarding_questions(id);


--
-- Name: _retired_onboarding_field_guidance onboarding_field_guidance_question_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public._retired_onboarding_field_guidance
    ADD CONSTRAINT onboarding_field_guidance_question_id_fkey FOREIGN KEY (question_id) REFERENCES public._retired_onboarding_questions(id) ON DELETE CASCADE;


--
-- Name: onboarding_notifications onboarding_notifications_session_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.onboarding_notifications
    ADD CONSTRAINT onboarding_notifications_session_id_fkey FOREIGN KEY (session_id) REFERENCES public.onboarding_sessions(id) ON DELETE CASCADE;


--
-- Name: onboarding_notifications onboarding_notifications_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.onboarding_notifications
    ADD CONSTRAINT onboarding_notifications_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(user_id);


--
-- Name: _retired_onboarding_question_options onboarding_question_options_question_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public._retired_onboarding_question_options
    ADD CONSTRAINT onboarding_question_options_question_id_fkey FOREIGN KEY (question_id) REFERENCES public._retired_onboarding_questions(id) ON DELETE CASCADE;


--
-- Name: _retired_onboarding_questions onboarding_questions_question_type_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public._retired_onboarding_questions
    ADD CONSTRAINT onboarding_questions_question_type_id_fkey FOREIGN KEY (question_type_id) REFERENCES public._retired_onboarding_question_types(id);


--
-- Name: _retired_onboarding_questions onboarding_questions_stage_code_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public._retired_onboarding_questions
    ADD CONSTRAINT onboarding_questions_stage_code_fkey FOREIGN KEY (stage_code) REFERENCES public._retired_onboarding_stage_definitions(stage_code);


--
-- Name: onboarding_recommendations onboarding_recommendations_session_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.onboarding_recommendations
    ADD CONSTRAINT onboarding_recommendations_session_id_fkey FOREIGN KEY (session_id) REFERENCES public.onboarding_sessions(id) ON DELETE CASCADE;


--
-- Name: onboarding_scores onboarding_scores_session_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.onboarding_scores
    ADD CONSTRAINT onboarding_scores_session_id_fkey FOREIGN KEY (session_id) REFERENCES public.onboarding_sessions(id) ON DELETE CASCADE;


--
-- Name: onboarding_sections onboarding_sections_session_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.onboarding_sections
    ADD CONSTRAINT onboarding_sections_session_id_fkey FOREIGN KEY (session_id) REFERENCES public.onboarding_sessions(id) ON DELETE CASCADE;


--
-- Name: onboarding_stages onboarding_stages_session_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.onboarding_stages
    ADD CONSTRAINT onboarding_stages_session_id_fkey FOREIGN KEY (session_id) REFERENCES public.onboarding_sessions(id) ON DELETE CASCADE;


--
-- Name: _retired_onboarding_user_answers onboarding_user_answers_question_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public._retired_onboarding_user_answers
    ADD CONSTRAINT onboarding_user_answers_question_id_fkey FOREIGN KEY (question_id) REFERENCES public._retired_onboarding_questions(id);


--
-- Name: org_hierarchy org_hierarchy_child_unit_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.org_hierarchy
    ADD CONSTRAINT org_hierarchy_child_unit_id_fkey FOREIGN KEY (child_unit_id) REFERENCES public.organization_units(id);


--
-- Name: org_hierarchy org_hierarchy_parent_unit_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.org_hierarchy
    ADD CONSTRAINT org_hierarchy_parent_unit_id_fkey FOREIGN KEY (parent_unit_id) REFERENCES public.organization_units(id);


--
-- Name: org_hierarchy org_hierarchy_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.org_hierarchy
    ADD CONSTRAINT org_hierarchy_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(tenant_id) ON DELETE CASCADE;


--
-- Name: organization_units organization_units_parent_unit_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.organization_units
    ADD CONSTRAINT organization_units_parent_unit_id_fkey FOREIGN KEY (parent_unit_id) REFERENCES public.organization_units(id);


--
-- Name: organization_units organization_units_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.organization_units
    ADD CONSTRAINT organization_units_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(tenant_id) ON DELETE CASCADE;


--
-- Name: password_reset_tokens password_reset_tokens_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.password_reset_tokens
    ADD CONSTRAINT password_reset_tokens_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(user_id);


--
-- Name: payments payments_subscription_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payments
    ADD CONSTRAINT payments_subscription_id_fkey FOREIGN KEY (subscription_id) REFERENCES public.subscriptions(subscription_id) ON DELETE SET NULL;


--
-- Name: payments payments_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payments
    ADD CONSTRAINT payments_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(tenant_id) ON DELETE CASCADE;


--
-- Name: platform_email_approvals platform_email_approvals_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.platform_email_approvals
    ADD CONSTRAINT platform_email_approvals_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(tenant_id);


--
-- Name: product_modules product_modules_product_key_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_modules
    ADD CONSTRAINT product_modules_product_key_fkey FOREIGN KEY (product_key) REFERENCES public.platform_products(product_key) ON DELETE CASCADE;


--
-- Name: provisioning_events provisioning_events_job_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.provisioning_events
    ADD CONSTRAINT provisioning_events_job_id_fkey FOREIGN KEY (job_id) REFERENCES public.provisioning_jobs(id) ON DELETE CASCADE;


--
-- Name: provisioning_events provisioning_events_step_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.provisioning_events
    ADD CONSTRAINT provisioning_events_step_id_fkey FOREIGN KEY (step_id) REFERENCES public.provisioning_steps(id) ON DELETE SET NULL;


--
-- Name: provisioning_jobs provisioning_jobs_session_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.provisioning_jobs
    ADD CONSTRAINT provisioning_jobs_session_id_fkey FOREIGN KEY (session_id) REFERENCES public.onboarding_sessions(id) ON DELETE CASCADE;


--
-- Name: provisioning_steps provisioning_steps_job_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.provisioning_steps
    ADD CONSTRAINT provisioning_steps_job_id_fkey FOREIGN KEY (job_id) REFERENCES public.provisioning_jobs(id) ON DELETE CASCADE;


--
-- Name: raci_config raci_config_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.raci_config
    ADD CONSTRAINT raci_config_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(tenant_id) ON DELETE CASCADE;


--
-- Name: regulator_sector_enforcement regulator_sector_enforcement_regulator_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.regulator_sector_enforcement
    ADD CONSTRAINT regulator_sector_enforcement_regulator_id_fkey FOREIGN KEY (regulator_id) REFERENCES public.regulators(regulator_id);


--
-- Name: regulator_sector_enforcement regulator_sector_enforcement_sector_code_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.regulator_sector_enforcement
    ADD CONSTRAINT regulator_sector_enforcement_sector_code_fkey FOREIGN KEY (sector_code) REFERENCES public.lookup_sectors(sector_code);


--
-- Name: regulatory_controls regulatory_controls_domain_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.regulatory_controls
    ADD CONSTRAINT regulatory_controls_domain_id_fkey FOREIGN KEY (domain_id) REFERENCES public.control_domains(id);


--
-- Name: regulatory_delta_impacts regulatory_delta_impacts_delta_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.regulatory_delta_impacts
    ADD CONSTRAINT regulatory_delta_impacts_delta_id_fkey FOREIGN KEY (delta_id) REFERENCES public.regulatory_deltas(delta_id);


--
-- Name: regulatory_delta_impacts regulatory_delta_impacts_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.regulatory_delta_impacts
    ADD CONSTRAINT regulatory_delta_impacts_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(tenant_id);


--
-- Name: regulatory_frameworks regulatory_frameworks_authority_code_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.regulatory_frameworks
    ADD CONSTRAINT regulatory_frameworks_authority_code_fkey FOREIGN KEY (authority_code) REFERENCES public.lookup_ksa_regulatory_authorities(authority_code);


--
-- Name: risk_control_mappings risk_control_mappings_control_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.risk_control_mappings
    ADD CONSTRAINT risk_control_mappings_control_id_fkey FOREIGN KEY (control_id) REFERENCES public.regulatory_controls(id);


--
-- Name: risk_control_mappings risk_control_mappings_risk_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.risk_control_mappings
    ADD CONSTRAINT risk_control_mappings_risk_id_fkey FOREIGN KEY (risk_id) REFERENCES public.risks(id);


--
-- Name: risk_criteria risk_criteria_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.risk_criteria
    ADD CONSTRAINT risk_criteria_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(tenant_id) ON DELETE CASCADE;


--
-- Name: risks risks_risk_category_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.risks
    ADD CONSTRAINT risks_risk_category_id_fkey FOREIGN KEY (risk_category_id) REFERENCES public.risk_categories(id);


--
-- Name: roadmap_tasks roadmap_tasks_roadmap_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.roadmap_tasks
    ADD CONSTRAINT roadmap_tasks_roadmap_id_fkey FOREIGN KEY (roadmap_id) REFERENCES public.roadmaps(roadmap_id);


--
-- Name: role_function_map role_function_map_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.role_function_map
    ADD CONSTRAINT role_function_map_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(tenant_id) ON DELETE CASCADE;


--
-- Name: roles roles_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.roles
    ADD CONSTRAINT roles_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(tenant_id);


--
-- Name: scan_schedules scan_schedules_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.scan_schedules
    ADD CONSTRAINT scan_schedules_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(tenant_id) ON DELETE CASCADE;


--
-- Name: sector_framework sector_framework_framework_code_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sector_framework
    ADD CONSTRAINT sector_framework_framework_code_fkey FOREIGN KEY (framework_code) REFERENCES public.lookup_frameworks(framework_code) ON DELETE CASCADE;


--
-- Name: sector_framework sector_framework_sector_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sector_framework
    ADD CONSTRAINT sector_framework_sector_id_fkey FOREIGN KEY (sector_id) REFERENCES public.sectors(sector_id) ON DELETE CASCADE;


--
-- Name: sector_isic_map sector_isic_map_sector_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sector_isic_map
    ADD CONSTRAINT sector_isic_map_sector_id_fkey FOREIGN KEY (sector_id) REFERENCES public.sectors(sector_id) ON DELETE CASCADE;


--
-- Name: sector_regulator sector_regulator_regulator_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sector_regulator
    ADD CONSTRAINT sector_regulator_regulator_id_fkey FOREIGN KEY (regulator_id) REFERENCES public.regulators(regulator_id) ON DELETE CASCADE;


--
-- Name: sector_regulator sector_regulator_sector_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sector_regulator
    ADD CONSTRAINT sector_regulator_sector_id_fkey FOREIGN KEY (sector_id) REFERENCES public.sectors(sector_id) ON DELETE CASCADE;


--
-- Name: sector_risks sector_risks_risk_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sector_risks
    ADD CONSTRAINT sector_risks_risk_id_fkey FOREIGN KEY (risk_id) REFERENCES public.risks(id);


--
-- Name: sector_risks sector_risks_sector_code_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sector_risks
    ADD CONSTRAINT sector_risks_sector_code_fkey FOREIGN KEY (sector_code) REFERENCES public.lookup_sectors(sector_code);


--
-- Name: sector_risks sector_risks_sector_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sector_risks
    ADD CONSTRAINT sector_risks_sector_id_fkey FOREIGN KEY (sector_id) REFERENCES public.sectors(sector_id);


--
-- Name: subscription_change_log subscription_change_log_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.subscription_change_log
    ADD CONSTRAINT subscription_change_log_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(tenant_id) ON DELETE CASCADE;


--
-- Name: subscriptions subscriptions_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.subscriptions
    ADD CONSTRAINT subscriptions_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(tenant_id) ON DELETE CASCADE;


--
-- Name: team_members team_members_team_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.team_members
    ADD CONSTRAINT team_members_team_id_fkey FOREIGN KEY (team_id) REFERENCES public.teams(team_id) ON DELETE CASCADE;


--
-- Name: teams teams_parent_team_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.teams
    ADD CONSTRAINT teams_parent_team_id_fkey FOREIGN KEY (parent_team_id) REFERENCES public.teams(team_id);


--
-- Name: tenant_blueprints tenant_blueprints_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tenant_blueprints
    ADD CONSTRAINT tenant_blueprints_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(tenant_id);


--
-- Name: tenant_module_entitlements tenant_module_entitlements_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tenant_module_entitlements
    ADD CONSTRAINT tenant_module_entitlements_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(tenant_id) ON DELETE CASCADE;


--
-- Name: tenant_regulatory_impacts tenant_regulatory_impacts_change_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tenant_regulatory_impacts
    ADD CONSTRAINT tenant_regulatory_impacts_change_id_fkey FOREIGN KEY (change_id) REFERENCES public.regulatory_change_log(change_id);


--
-- Name: tenant_regulatory_profile tenant_regulatory_profile_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tenant_regulatory_profile
    ADD CONSTRAINT tenant_regulatory_profile_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(tenant_id) ON DELETE CASCADE;


--
-- Name: tenant_settings tenant_settings_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tenant_settings
    ADD CONSTRAINT tenant_settings_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(tenant_id) ON DELETE CASCADE;


--
-- Name: tenant_sso_config tenant_sso_config_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tenant_sso_config
    ADD CONSTRAINT tenant_sso_config_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(tenant_id) ON DELETE CASCADE;


--
-- Name: tenant_user_memberships tenant_user_memberships_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tenant_user_memberships
    ADD CONSTRAINT tenant_user_memberships_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(tenant_id) ON DELETE CASCADE;


--
-- Name: tenant_user_memberships tenant_user_memberships_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tenant_user_memberships
    ADD CONSTRAINT tenant_user_memberships_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(user_id) ON DELETE CASCADE;


--
-- Name: training_schedules training_schedules_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.training_schedules
    ADD CONSTRAINT training_schedules_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(tenant_id) ON DELETE CASCADE;


--
-- Name: user_activities user_activities_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_activities
    ADD CONSTRAINT user_activities_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(tenant_id);


--
-- Name: user_activities user_activities_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_activities
    ADD CONSTRAINT user_activities_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(user_id);


--
-- Name: user_function_overrides user_function_overrides_function_code_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_function_overrides
    ADD CONSTRAINT user_function_overrides_function_code_fkey FOREIGN KEY (function_code) REFERENCES public.role_functions(function_code) ON DELETE CASCADE;


--
-- Name: user_mfa user_mfa_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_mfa
    ADD CONSTRAINT user_mfa_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(user_id);


--
-- Name: users users_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(tenant_id);


--
-- Name: vendor_assessments vendor_assessments_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vendor_assessments
    ADD CONSTRAINT vendor_assessments_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(tenant_id) ON DELETE CASCADE;


--
-- Name: workspace_onboarding_links workspace_onboarding_links_onboarding_session_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.workspace_onboarding_links
    ADD CONSTRAINT workspace_onboarding_links_onboarding_session_id_fkey FOREIGN KEY (onboarding_session_id) REFERENCES public.onboarding_sessions(id) ON DELETE CASCADE;


--
-- Name: workspace_onboarding_links workspace_onboarding_links_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.workspace_onboarding_links
    ADD CONSTRAINT workspace_onboarding_links_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(tenant_id);


--
-- Name: authorization_audit_log; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.authorization_audit_log ENABLE ROW LEVEL SECURITY;

--
-- Name: authorization_audit_log rls_auth_audit_tenant; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY rls_auth_audit_tenant ON public.authorization_audit_log USING (((current_setting('app.current_tenant_id'::text, true) IS NULL) OR (current_setting('app.current_tenant_id'::text, true) = ''::text) OR (tenant_id IS NULL) OR ((tenant_id)::text = current_setting('app.current_tenant_id'::text, true)))) WITH CHECK (true);


--
-- Name: roles rls_roles_tenant; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY rls_roles_tenant ON public.roles USING (((current_setting('app.current_tenant_id'::text, true) IS NULL) OR (current_setting('app.current_tenant_id'::text, true) = ''::text) OR (tenant_id IS NULL) OR ((tenant_id)::text = current_setting('app.current_tenant_id'::text, true)))) WITH CHECK (true);


--
-- Name: user_activities rls_user_activities_tenant; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY rls_user_activities_tenant ON public.user_activities USING (((current_setting('app.current_tenant_id'::text, true) IS NULL) OR (current_setting('app.current_tenant_id'::text, true) = ''::text) OR (tenant_id IS NULL) OR ((tenant_id)::text = current_setting('app.current_tenant_id'::text, true)))) WITH CHECK (true);


--
-- Name: users rls_users_tenant; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY rls_users_tenant ON public.users USING (((current_setting('app.current_tenant_id'::text, true) IS NULL) OR (current_setting('app.current_tenant_id'::text, true) = ''::text) OR (tenant_id IS NULL) OR ((tenant_id)::text = current_setting('app.current_tenant_id'::text, true)))) WITH CHECK (true);


--
-- Name: roles; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;

--
-- Name: user_activities; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.user_activities ENABLE ROW LEVEL SECURITY;

--
-- Name: users; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

--

--

\unrestrict t5AI49aYLCXCPLxBDHj8C7ebkf1Mhgn0vPnrvw97Tf6vZZ2bcqlnte7FK2WOueo
