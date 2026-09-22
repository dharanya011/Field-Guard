/**
 * Offline Local Rules Engine for FIELD GUARD.
 * Provides deterministic, verified field inspection guidance when offline or when Gemini is unreachable.
 * Strictly adheres to ISO 10816, NFPA 10, OSHA 1910 standards.
 * Does NOT generate fake answers when a question is outside local scope.
 */

export interface LocalRuleMatch {
  matched: boolean;
  text: string;
  category?: string;
}

export class LocalAiRulesEngine {
  public static evaluate(query: string): LocalRuleMatch {
    const q = query.toLowerCase().trim();

    // 1. Fire Extinguisher Inspection
    if (q.includes('fire extinguisher') || (q.includes('extinguisher') && q.includes('check'))) {
      return {
        matched: true,
        category: 'NFPA 10 Extinguisher Protocol',
        text: `**NFPA 10 Fire Extinguisher Field Inspection Protocol**:\n\n` +
          `1. **Pressure Gauge**: Needle must sit squarely inside the certified green operating zone (typically 100–195 PSI depending on unit).\n` +
          `2. **Safety Pin & Tamper Seal**: Pull pin must be securely locked with intact copper wire or plastic tamper seal.\n` +
          `3. **Physical Condition**: Check cylinder for corrosion, dents deeper than 0.5mm, nozzle obstructions, or cracked rubber discharge hose.\n` +
          `4. **Inspection Tag & Hydrostatic Date**: Confirm annual inspection collar is punched and hydrostatic test date is within 5 or 12-year validity.`
      };
    }

    // 2. Pressure Gauge Outside Green Zone
    if (q.includes('outside the green zone') || (q.includes('pressure gauge') && (q.includes('outside') || q.includes('needle') || q.includes('red') || q.includes('high') || q.includes('low')))) {
      return {
        matched: true,
        category: 'Pressure Anomaly Protocol',
        text: `**Pressure Gauge Out-of-Tolerance Protocol**:\n\n` +
          `1. **Record Status as FAIL**: Any reading outside the certified green arc is an out-of-tolerance condition.\n` +
          `2. **Over-Pressure (> Green Arc)**: Indicates thermal expansion, failed upstream regulator, or overfill. Do not tap the gauge. Tag out the asset if safety relief is compromised.\n` +
          `3. **Under-Pressure (< Green Arc)**: Indicates propellant leakage or discharge. Asset is inoperable.\n` +
          `4. **Required Evidence**: Capture a macro photo of the gauge face showing dial markings, log measured PSI in notes, and notify your supervisor.`
      };
    }

    // 3. PASS vs FAIL vs WARNING definitions
    if (q.includes('pass') && q.includes('fail') || q.includes('what does pass mean') || q.includes('what does fail mean')) {
      return {
        matched: true,
        category: 'FIELD GUARD Status Definitions',
        text: `**FIELD GUARD Inspection Status Standards**:\n\n` +
          `• **PASS (Score 100%)**: All mechanical, structural, and safety criteria meet or exceed certified manufacturer & ISO tolerances.\n` +
          `• **WARNING (Score 70–85%)**: Minor cosmetic or non-critical advisory issue observed that does not compromise immediate operational safety (e.g. minor paint wear, superficial dust).\n` +
          `• **FAIL (Score <70% or Critical Defect)**: Breach of safety tolerance, structural crack, pressure failure, broken tamper wire, or missing safety pin. Requires immediate remediation and supervisor review.\n` +
          `• **CONFLICT**: Multiple inspectors have submitted contradictory data points requiring supervisor manual arbitration.`
      };
    }

    // 4. Evidence Recording Guidelines
    if (q.includes('record evidence') || q.includes('capture evidence') || (q.includes('evidence') && (q.includes('how') || q.includes('photo')))) {
      return {
        matched: true,
        category: 'Field Evidence Standard',
        text: `**Evidence Capture Requirements**:\n\n` +
          `1. **Macro Photographic Proof**: Capture clear, well-lit photo of the exact defect, gauge reading, or serial tag.\n` +
          `2. **GPS Geostamp**: Ensure GPS location is locked with accuracy < 10 meters.\n` +
          `3. **Quantitative Notes**: Record exact measured numeric values (PSI, mm crack depth, vibration mm/s) instead of vague descriptions.\n` +
          `4. **Cryptographic Chaining**: Evidence is hashed with SHA-256 and queued for delta sync.`
      };
    }

    // 5. Conflict Resolution Workflow
    if (q.includes('two technicians') || q.includes('disagree') || q.includes('conflict') || q.includes('different result')) {
      return {
        matched: true,
        category: 'CRDT Conflict Resolution Protocol',
        text: `**Dual-Inspector Conflict Resolution Workflow**:\n\n` +
          `1. **Detection**: The system detects divergent checklist values or signatures using CRDT timestamp & operation tracking.\n` +
          `2. **Supervisor Action**: Only a verified SUPERVISOR or ADMIN can resolve active conflicts in the Conflicts view.\n` +
          `3. **Review Process**: Compare Technician A vs Technician B timestamps, evidence photos, and field notes.\n` +
          `4. **Resolution Options**: Select 'Use Local', 'Use Server', or perform a physical on-site re-verification.`
      };
    }

    // 6. 4-Point Field Checklist
    if (q.includes('what should i check') || q.includes('checklist') || q.includes('4-point') || q.includes('field checklist')) {
      return {
        matched: true,
        category: 'Mandatory 4-Point Checklist',
        text: `**Mandatory 4-Point Field Integrity Checklist**:\n\n` +
          `1. **Pressure Gauge**: Operating PSI must sit strictly within certified green arc tolerance; dial glass intact with zero dampening fluid leaks.\n` +
          `2. **Safety Seal**: Tamper-evident copper wire anchor and lead lock seal fully intact with matching serial tags.\n` +
          `3. **Physical Damage**: Enclosure casing free of impact dents (>0.5mm), weld micro-fractures, or arc flash oxidation.\n` +
          `4. **Expiry Date**: Hydrostatic certification collar and quarterly compliance stamp must be current.`
      };
    }

    // 7. General greeting when offline
    if (q === 'hello' || q === 'hi' || q === 'hey') {
      return {
        matched: true,
        category: 'Local Rules Assistant',
        text: `Hello! I am operating in **Local Rules Mode** (offline inspection assistance). You can ask about 4-point checklist requirements, pressure gauge tolerances, safety seals, PASS/FAIL standards, evidence recording, or conflict resolution procedures.`
      };
    }

    // Unmatched offline query -> strictly state unavailable, DO NOT hallucinate fake answer
    return {
      matched: false,
      text: `AI is currently offline and this question is not available in the local inspection knowledge base. Please connect to the network to use full Gemini AI.`
    };
  }
}
