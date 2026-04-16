import type { SeedDemoCatalog } from '../types'

/** Portuguese copy for offline demo entities. */
export const demoEntityOverlaysPt: Pick<
  SeedDemoCatalog,
  'demoCompanies' | 'demoContacts' | 'demoDeals' | 'demoActivities' | 'demoEmails'
> = {
  demoCompanies: {
    c1: {
      country: 'Espanha',
      notes: 'Conta estratégica. Renovação anual em junho.',
    },
    c2: {
      country: 'Espanha',
      notes: 'Parceiro tecnológico. Integração em curso.',
    },
    c3: {
      name: 'Mapfre Inovação',
      country: 'Espanha',
      notes: 'Interesse no módulo de reporting avançado.',
    },
    c4: {
      country: 'Espanha',
      notes: 'Scale-up de energia. Expansão para Portugal.',
    },
    c5: {
      country: 'Espanha',
      notes: 'Conta principal. Contrato plurianual.',
    },
    c6: {
      country: 'Espanha',
      notes: 'Equipa técnica exigente. POC em curso.',
    },
    c7: {
      country: 'Espanha',
      notes: 'Parceiro de implementação. Canal indireto.',
    },
    c8: {
      name: 'Flywire Espanha',
      country: 'Espanha',
      notes: 'Upsell do módulo de pagamentos internacionais.',
    },
    c9: {
      country: 'Espanha',
      notes: 'Ciclo de compra longo. Jurídico envolvido.',
    },
    c10: {
      country: 'Espanha',
      notes: 'Perdemos o contrato no Q3. Reengajamento planeado.',
    },
  },
  demoContacts: {
    ct1: {
      notes: 'Contacto principal no Bankia. Decisor técnico.',
    },
    ct2: {
      jobTitle: 'Diretora de compras',
      notes: 'Responsável por contratos. Muito rigorosa com SLAs.',
    },
    ct3: {
      notes: 'Muito técnico. Prefere comunicação no Slack.',
    },
    ct4: {
      notes: 'Conhecida no SaaStr Annual 2024. Muito orientada a crescimento.',
    },
    ct5: {
      jobTitle: 'Diretor de inovação',
      notes: 'Apresentação em janeiro. Esperamos proposta em março.',
    },
    ct6: {
      notes: 'Validação de orçamento. Processo longo esperado.',
    },
    ct7: {
      notes: 'A testar trial gratuito. Muito ativo no dashboard.',
    },
    ct8: {
      notes: 'Contacto executivo. Reuniões trimestrais de negócio.',
    },
    ct9: {
      notes: 'Interlocutor técnico. Avalia a arquitetura de integração.',
    },
    ct10: {
      notes: 'Ex-Amazon. Muito exigente com performance.',
    },
    ct11: {
      notes: 'Contacto operacional. Coordena a POC.',
    },
    ct12: {
      notes: 'Referência de parcerias. Traz oportunidades enterprise.',
    },
    ct13: {
      notes: 'Implementa projetos com o nosso produto.',
    },
    ct14: {
      notes: 'Responsável pelo orçamento de tecnologia.',
    },
    ct15: {
      notes: 'Muito envolvido em integrações de API.',
    },
    ct16: {
      notes: 'Conhecida no HealthTech Summit. Mandato de digitalização.',
    },
    ct17: {
      notes: 'Avalia a arquitetura técnica da solução.',
    },
    ct18: {
      notes: 'Foi para um concorrente. Possível reengajamento em 2026.',
    },
    ct19: {
      notes: 'Desiludido com o suporte. Precisamos melhorar o NPS.',
    },
    ct20: {
      notes: 'Chegou pela campanha Google Ads. Empresa de logística.',
    },
    ct21: {
      notes: 'Contactou pelo LinkedIn. Série A em curso.',
    },
    ct22: {
      notes: 'Referida pela Beatriz. Expansão para LATAM.',
    },
    ct23: {
      notes: 'Muito envolvido na expansão internacional.',
    },
    ct24: {
      notes: 'Conhecida no hackathon MAPFRE. Campeã interna.',
    },
    ct25: {
      notes: 'Ela gere a renovação do contrato enterprise.',
    },
  },
  demoDeals: {
    d1: {
      title: 'Bankia — Plataforma de analytics',
      notes: 'Projeto fechado com sucesso. Inclui formação.',
    },
    d2: {
      title: 'Bankia — Módulo de compliance',
      notes: 'Expansão após o sucesso da plataforma de analytics.',
    },
    d3: {
      title: 'Factorial — Integração API RH',
      notes: 'A negociar termos de SLA. Rever cláusula de exclusividade.',
    },
    d4: {
      title: 'Mapfre — Suite de reporting',
      notes: 'Proposta enviada. À espera de feedback jurídico.',
    },
    d5: {
      title: 'Mapfre — Consultoria de transformação',
      notes: 'Oportunidade detetada no hackathon. Ainda em exploração.',
    },
    d6: {
      title: 'Holaluz — SaaS Starter',
      notes: 'Veio do trial. Demo realizada.',
    },
    d7: {
      title: 'Inditex — Plataforma global',
      notes: 'Mega negócio. Contrato de 3 anos.',
    },
    d8: {
      title: 'Inditex — Renovação enterprise',
      notes: 'Renovação global. Desconto de fidelização em negociação.',
    },
    d9: {
      title: 'Cabify — POC da plataforma',
      notes: 'POC técnica em curso. Resultados esperados em abril.',
    },
    d10: {
      title: 'Deloitte — Acordo de parceria',
      notes: 'Acordo de canal indireto. Comissão de 15% sobre vendas geradas.',
    },
    d11: {
      title: 'Flywire — Módulo de pagamentos internacionais',
      notes: 'Upsell de pagamentos. Contrato-quadro já assinado.',
    },
    d12: {
      title: 'Flywire — Integração API',
      notes: 'Integração personalizada. Requer desenvolvimento adicional.',
    },
    d13: {
      title: 'Sanitas — Digitalização da saúde',
      notes: 'Grande oportunidade. Ciclo de vendas estimado em 6 meses.',
    },
    d14: {
      title: 'Glovo — Plataforma logística',
      notes: 'Perdido para concorrente. Preço e suporte foram os motivos.',
    },
    d15: {
      title: 'Inditex — Módulo Analytics Plus',
      notes: 'Identificado na reunião trimestral. Aprovação de orçamento pendente.',
    },
    d16: {
      title: 'Bankia — Formação de equipas',
      notes: 'Workshop de 2 dias para 30 pessoas.',
    },
    d17: {
      title: 'Factorial — Módulo de salários',
      notes: 'Detetado na reunião de acompanhamento. Interesse ainda não confirmado.',
    },
    d18: {
      title: 'Cabify — Licença enterprise',
      notes: 'Se a POC for bem-sucedida, converte em licença enterprise.',
    },
  },
  demoActivities: {
    a1: {
      subject: 'Kick-off Bankia Analytics',
      description: 'Reunião de arranque com a equipa técnica do Bankia.',
      outcome: 'Positivo. Equipa motivada. Roadmap acordado.',
    },
    a2: {
      subject: 'Chamada de acompanhamento Bankia',
      description: 'Chamada sobre o progresso da implementação.',
      outcome: 'Dentro do prazo. Pequenos ajustes no módulo de reporting.',
    },
    a3: {
      subject: 'Fecho e assinatura contrato Bankia Analytics',
      description: 'Email com documentação final e link para assinatura eletrónica.',
      outcome: 'Contrato assinado. Negócio fechado.',
    },
    a4: {
      subject: 'Demo módulo Compliance Bankia',
      description: 'Apresentação do módulo de compliance regulatório.',
      outcome: 'Interesse confirmado. Pedem proposta formal.',
    },
    a5: {
      subject: 'Enviar proposta Compliance Bankia',
      description: 'Preparar e enviar proposta detalhada com preço e cronograma.',
    },
    a6: {
      subject: 'Negociação SLA Factorial',
      description: 'Chamada para discutir termos de SLA e exclusividade.',
      outcome: 'Acordo em 99,9% uptime. Exclusividade recusada.',
    },
    a7: {
      subject: 'Revisão de contrato Factorial',
      description: 'Reunião com jurídico para rever o contrato final.',
    },
    a8: {
      subject: 'Apresentação suite reporting Mapfre',
      description: 'Demo completa da suite de reporting para a equipa Mapfre.',
      outcome: 'Muito interessados. Pediram proposta comercial.',
    },
    a9: {
      subject: 'Proposta económica Mapfre reporting',
      description: 'Envio de proposta com custos e ROI estimado.',
      outcome: 'Recebida. Em revisão com jurídico e finanças.',
    },
    a10: {
      subject: 'Chamada discovery consultoria Mapfre',
      description: 'Chamada inicial para perceber necessidades de transformação digital.',
      outcome: 'Interesse moderado. Orçamento limitado inicialmente.',
    },
    a11: {
      subject: 'Follow-up demo Holaluz',
      description: 'Email de acompanhamento após demo online. Casos de uso anexos.',
    },
    a12: {
      subject: 'QBR Inditex Q3',
      description: 'Revisão trimestral de negócio com a liderança Inditex.',
      outcome: 'Excelente. Alta satisfação. Identificadas 2 novas oportunidades.',
    },
    a13: {
      subject: 'Negociação final Inditex Global',
      description: 'Chamada para alinhar termos finais do contrato plurianual.',
      outcome: 'Acordo alcançado. Desconto de 8% em troca de 3 anos.',
    },
    a14: {
      subject: 'Assinatura contrato Inditex',
      description: 'Documentação assinada. Contrato plurianual ativado.',
      outcome: 'Negócio fechado com sucesso.',
    },
    a15: {
      subject: 'QBR Inditex Q1 2026',
      description: 'Revisão trimestral e conversa sobre renovação.',
      outcome: 'Muito satisfeitos. Abertos a renovar com melhorias.',
    },
    a16: {
      subject: 'Preparar proposta renovação Inditex',
      description: 'Elaborar proposta de renovação com novas funcionalidades e preço.',
    },
    a17: {
      subject: 'Demo técnica Cabify',
      description: 'Demo técnica profunda com a equipa de engenharia Cabify.',
      outcome: 'Positivo. Pediram POC de 30 dias.',
    },
    a18: {
      subject: 'Configurar ambiente POC Cabify',
      description: 'Preparar ambiente de testes para POC com dados Cabify.',
    },
    a19: {
      subject: 'Assinatura acordo parceria Deloitte',
      description: 'Reunião de fecho do acordo de canal indireto.',
      outcome: 'Acordo assinado. Canal ativo em 30 dias.',
    },
    a20: {
      subject: 'Onboarding parceiro Deloitte',
      description: 'Envio de materiais de onboarding e acesso ao portal de parceiros.',
      outcome: 'Concluído.',
    },
    a21: {
      subject: 'Negociação Flywire pagamentos',
      description: 'Discussão sobre condições do módulo de pagamentos internacionais.',
      outcome: 'Acordo de preço. Pendente validação jurídica.',
    },
    a22: {
      subject: 'Revisão jurídica contrato Flywire',
      description: 'Coordenação com jurídico para revisão do contrato.',
    },
    a23: {
      subject: 'Proposta integração API Flywire',
      description: 'Proposta técnica e económica para integração personalizada.',
    },
    a24: {
      subject: 'Discovery digitalização Sanitas',
      description: 'Reunião inicial de discovery com o CDO da Sanitas.',
      outcome: 'Grande oportunidade. Mandato de transformação digital claro.',
    },
    a25: {
      subject: 'Enviar casos de uso setor saúde',
      description: 'Preparar e enviar casos de uso específicos de saúde.',
    },
    a26: {
      subject: 'Demo final Glovo',
      description: 'Apresentação final antes da decisão de compra da Glovo.',
      outcome: 'Insatisfatório. Preferiram concorrente por preço.',
    },
    a27: {
      subject: 'Análise pós-mortem Glovo',
      description: 'Perdemos por preço (15% mais caro) e tempo de resposta do suporte. Ações: melhorar SLA de suporte e rever pricing competitivo.',
    },
    a28: {
      subject: 'Workshop formação Bankia',
      description: 'Sessão de formação presencial de 2 dias em Madrid.',
      outcome: 'Excelente avaliação. NPS 9/10.',
    },
    a29: {
      subject: 'Ligação LinkedIn — Sofía Moreno',
      description: 'Contacto inicial no LinkedIn sobre licença enterprise.',
      outcome: 'Aceitou reunião. Muito receptiva.',
    },
    a30: {
      subject: 'Apresentação proposta Cabify Enterprise',
      description: 'Chamada para apresentar proposta de licença enterprise.',
      outcome: 'Muito interessados. À espera dos resultados da POC.',
    },
  },
  demoEmails: {
    em1: {
      subject: 'Bankia — proposta módulo Compliance',
      body: 'Partilho a proposta com âmbito, cronograma e preços do módulo Compliance. Se fizer sentido, revemos amanhã às 11:00.',
    },
    em2: {
      subject: 'Re: Bankia — proposta módulo Compliance',
      body: 'Obrigada David. Vamos rever com jurídico hoje e confirmo comentários. Por agora encaixa bem.',
    },
    em3: {
      subject: 'Renovação Enterprise 2026 — proposta final',
      body: 'Segue em anexo a proposta final de renovação com melhoria de SLA e roadmap Q3/Q4. Fico atento para fechar esta semana.',
    },
    em4: {
      subject: 'Contrato pagamentos internacionais — próximos passos',
      body: 'Perfeito Cristina. Sugiro rever cláusulas jurídicas na quinta-feira e fechar na próxima semana.',
    },
  },
}
